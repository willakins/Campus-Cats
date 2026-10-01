const { watch } = require('node:fs');
const { resolve } = require('node:path');
const { spawn } = require('node:child_process');

const {
  generatePlatformInfo,
  sourcePath,
} = require('./generate-functions-platform-info');

const projectRoot = resolve(__dirname, '..');
const functionsRoot = resolve(projectRoot, 'functions');
const compilerPath = resolve(functionsRoot, 'node_modules/typescript/bin/tsc');

generatePlatformInfo();

const compiler = spawn(process.execPath, [compilerPath, '--watch'], {
  cwd: functionsRoot,
  stdio: 'inherit',
});
const watcher = watch(sourcePath, () => {
  try {
    generatePlatformInfo();
  } catch (error) {
    console.error(error);
  }
});
let stopping = false;

const stop = () => {
  stopping = true;
  watcher.close();
  compiler.kill('SIGTERM');
};

process.once('SIGINT', stop);
process.once('SIGTERM', stop);
compiler.once('exit', (code) => {
  watcher.close();
  process.exitCode = stopping ? 0 : code ?? 1;
});
