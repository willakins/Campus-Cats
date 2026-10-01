const { rmSync } = require('node:fs');
const { resolve } = require('node:path');

const functionsBuildDirectory = resolve(__dirname, '..', 'functions', 'lib');

rmSync(functionsBuildDirectory, { recursive: true, force: true });
