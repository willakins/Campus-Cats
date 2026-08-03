const path = require('node:path');

const summary = require('../coverage/coverage-summary.json');

const groups = [
  { label: 'domain', segment: `${path.sep}core${path.sep}domain${path.sep}` },
  { label: 'media application', segment: `${path.sep}core${path.sep}media${path.sep}` },
  { label: 'feature application', segment: `${path.sep}features${path.sep}` },
];

let failed = false;
for (const group of groups) {
  const files = Object.entries(summary).filter(
    ([filename]) => filename !== 'total' && filename.includes(group.segment),
  );
  const branches = files.reduce(
    (totals, [, coverage]) => ({
      covered: totals.covered + coverage.branches.covered,
      total: totals.total + coverage.branches.total,
    }),
    { covered: 0, total: 0 },
  );
  if (files.length === 0) {
    console.error(`${group.label} coverage group did not match any files.`);
    failed = true;
    continue;
  }
  const percent = branches.total === 0 ? 100 : (branches.covered / branches.total) * 100;
  console.log(`${group.label} branch coverage: ${percent.toFixed(2)}%`);
  if (percent < 90) failed = true;
}

if (failed) {
  console.error('Domain and application branch coverage must remain at or above 90%.');
  process.exitCode = 1;
}
