const { copyFileSync, existsSync, mkdirSync, rmSync, symlinkSync } = require('node:fs');
const { dirname, join, resolve } = require('node:path');

const source = resolve(__dirname, '..', 'functions', 'lib');
const destination = resolve(__dirname, 'lib');
const compiledModules = [
  'coreCallables.js',
  'handlers.js',
  'communityVoting.js',
  'participation.js',
];

rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });

for (const moduleName of compiledModules) {
  const sourceFile = join(source, moduleName);
  if (!existsSync(sourceFile)) {
    throw new Error(`Missing compiled Functions module: ${sourceFile}`);
  }
  const destinationFile = join(destination, moduleName);
  mkdirSync(dirname(destinationFile), { recursive: true });
  copyFileSync(sourceFile, destinationFile);
}

const localDependencies = resolve(__dirname, 'node_modules');
if (!existsSync(localDependencies)) {
  symlinkSync(resolve(__dirname, '..', 'functions', 'node_modules'), localDependencies, 'dir');
}
