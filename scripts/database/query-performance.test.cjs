'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizePlan } = require('./query-performance.cjs');

test('query reports retain useful timing/index information without exposing plan literals or row contents', () => {
  const report = summarizePlan([
    {
      'Planning Time': 0.2,
      'Execution Time': 1.5,
      Plan: {
        'Node Type': 'Limit',
        'Actual Rows': 40,
        'Shared Hit Blocks': 12,
        Output: ['private_member_identifier'],
        Plans: [
          {
            'Node Type': 'Index Scan',
            'Relation Name': 'sightings',
            'Index Name': 'sightings_recent_idx',
            'Plan Rows': 100,
            'Actual Rows': 40,
            'Actual Loops': 1,
            'Index Cond': "user_id = 'private_member_identifier'",
            Filter: "secret_value = 'credential'",
          },
        ],
      },
    },
  ]);
  assert.equal(report.executionMs, 1.5);
  assert.equal(report.sharedBlocksHit, 12);
  assert.equal(report.nodes[1].index, 'sightings_recent_idx');
  assert.equal(report.nodes[1].actualRows, 40);
  assert.doesNotMatch(
    JSON.stringify(report),
    /private_member_identifier|credential|secret_value|Index Cond/,
  );
});
