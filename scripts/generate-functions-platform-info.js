const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { dirname, resolve } = require('node:path');

const projectRoot = resolve(__dirname, '..');
const sourcePath = resolve(projectRoot, 'config/platformInfo.json');
const outputPath = resolve(projectRoot, 'functions/lib/platformInfo.js');
const declarationPath = resolve(projectRoot, 'functions/src/platformInfo.d.ts');

const generatePlatformInfo = () => {
  const platformInfo = JSON.parse(readFileSync(sourcePath, 'utf8'));

  if (
    !platformInfo ||
    Array.isArray(platformInfo) ||
    typeof platformInfo !== 'object' ||
    typeof platformInfo.supportEmail !== 'string'
  ) {
    throw new Error('config/platformInfo.json requires a supportEmail');
  }

  for (const [field, value] of Object.entries(platformInfo)) {
    if (!/^[A-Za-z_$][\w$]*$/.test(field)) {
      throw new Error(`config/platformInfo.json contains an invalid field: ${field}`);
    }
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`config/platformInfo.json requires a non-empty ${field}`);
    }
  }

  const source = [
    "'use strict';",
    '',
    '// Generated from config/platformInfo.json by the Functions build.',
    `const PLATFORM_INFO = Object.freeze(${JSON.stringify(platformInfo, null, 2)});`,
    '',
    'module.exports = { PLATFORM_INFO };',
    '',
  ].join('\n');

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, source);

  const declaration = [
    '// Generated from config/platformInfo.json by the Functions build.',
    'export declare const PLATFORM_INFO: Readonly<{',
    ...Object.keys(platformInfo).map((field) => `  ${field}: string;`),
    '}>;',
    '',
  ].join('\n');

  writeFileSync(declarationPath, declaration);
};

if (require.main === module) generatePlatformInfo();

module.exports = { generatePlatformInfo, sourcePath };
