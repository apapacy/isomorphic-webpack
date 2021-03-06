// @flow

import path from 'path';
import {
  Compiler,
  DllPlugin
} from 'webpack';
import createDebug from 'debug';
import findInstance from '../utilities/findInstance';
import createResourceMap from './createResourceMap';

const debug = createDebug('isomorphic-webpack');

export default (compiler: Compiler, callback: Function): Function => {
  const dllPlugin = findInstance(compiler.options.plugins, DllPlugin);
  const manifestPath = dllPlugin.options.path;

  debug('manifestPath', manifestPath);

  const outputFileSystem = compiler.outputFileSystem;

  return (error: Object, stats: Object) => {
    if (error) {
      debug('compiler error:', error);

      return;
    }

    if (stats.compilation.errors.length) {
      debug('compilation error', stats.compilation.errors);

      return;
    }

    if (stats.compilation.missingDependencies.length) {
      debug('aborting compilation; missing dependencies', stats.compilation.missingDependencies);

      return;
    }

    if (!outputFileSystem.existsSync(manifestPath)) {
      throw new Error('Manifest file does not exist.');
    }

    const manifest = JSON.parse(outputFileSystem.readFileSync(manifestPath));

    debug('manifest', manifest);

    const requestMap = createResourceMap(manifest.content);

    debug('requestMap', requestMap);

    const files = stats.compilation.chunks[0].files.filter((file) => {
      return /\.js$/.test(file);
    });
    const bundleName = files[files.length - 1];

    debug('bundleName', bundleName);

    const absoluteEntryBundleName = path.resolve(compiler.options.output.path, bundleName);

    if (!outputFileSystem.existsSync(absoluteEntryBundleName)) {
      throw new Error('Bundle file does not exist.');
    }

    if (!outputFileSystem.existsSync(absoluteEntryBundleName + '.map')) {
      throw new Error('Bundle map file does not exist.');
    }

    const bundleCode = outputFileSystem.readFileSync(absoluteEntryBundleName, 'utf-8');

    const bundleSourceMap = JSON.parse(outputFileSystem.readFileSync(absoluteEntryBundleName + '.map', 'utf-8'));

    callback({
      bundleCode,
      bundleSourceMap,
      requestMap
    });
  };
};
