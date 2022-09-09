const gitRevSync = require('git-rev-sync');
const pkg = require('../package.json');
const { sources, Compilation } = require('webpack');

let commit = 'unknown';

try {
  commit = gitRevSync.short();
} catch (e) {
  console.warn('Error fetching current git commit: ' + e);
}

const version = JSON.stringify({
  commit,
  source: pkg.homepage,
  version: process.env.CIRCLE_TAG || `v${pkg.version}`,
});

class VersionPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('VersionPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'VersionPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        () => {
          compilation.emitAsset('version.json', new sources.RawSource(version));
        }
      );
    });
  }
}

module.exports = VersionPlugin;
