const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const sourceRoots = ['app', 'components', 'config', 'forms', 'theme'];
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const checks = [
  {
    pattern: /@firebase\/auth\/dist\//g,
    message: 'Import Firebase Auth through its supported public entry point.',
  },
  {
    pattern: /\bpointerEvents\s*=/g,
    message: 'Put pointerEvents in the style object instead of using the deprecated prop.',
  },
];

const files = [];

const collectFiles = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectFiles(absolutePath);
    } else if (
      sourceExtensions.has(path.extname(entry.name)) &&
      !entry.name.includes('.test.')
    ) {
      files.push(absolutePath);
    }
  }
};

for (const root of sourceRoots) {
  const absoluteRoot = path.join(projectRoot, root);
  if (fs.existsSync(absoluteRoot)) collectFiles(absoluteRoot);
}

const violations = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const check of checks) {
    check.pattern.lastIndex = 0;
    for (const match of source.matchAll(check.pattern)) {
      const line = source.slice(0, match.index).split('\n').length;
      violations.push(`${path.relative(projectRoot, file)}:${line} ${check.message}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Platform compatibility check failed:\n');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log(`Platform compatibility check passed (${files.length} source files).`);
