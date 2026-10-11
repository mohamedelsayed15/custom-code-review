#!/usr/bin/env node
// Scores review runs against known issues.
//
//   node <skill-dir>/evals/score.mjs <cases-dir> <run-dir>
//
// <cases-dir> holds one JSON file per case (evals/README.md). <run-dir> holds
// the skill's `json` output for each case, saved as `<case id>.json`. A
// finding matches an expected issue when the file is the same and, if both
// give a line, the lines are at most `tolerance` apart (default 5). Each
// expected issue is matched at most once.
//
// Prints one row per case and the totals: precision (found issues that were
// real), recall (real issues that were found) and false alarms on clean cases.
// Exit code 2 when the input cannot be used.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_TOLERANCE = 5;

const [casesDir, runDir] = process.argv.slice(2);
if (!casesDir || !runDir) {
  console.error('usage: score.mjs <cases-dir> <run-dir>');
  process.exit(2);
}

const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`cannot read ${file}: ${error.message}`);
    process.exit(2);
  }
};

const normalize = (file) => (file ? path.posix.normalize(String(file).replaceAll('\\', '/')) : null);

const matches = (finding, issue) => {
  if (normalize(finding.file) !== normalize(issue.file)) return false;
  if (finding.line == null || issue.line == null) return true;
  return Math.abs(finding.line - issue.line) <= (issue.tolerance ?? DEFAULT_TOLERANCE);
};

const caseFiles = readdirSync(casesDir).filter((name) => name.endsWith('.json')).sort();
if (!caseFiles.length) {
  console.error(`no case files in ${casesDir}`);
  process.exit(2);
}

const totals = { found: 0, real: 0, matched: 0, cleanCases: 0, falseAlarms: 0, missingRuns: 0 };
const rows = [];

for (const name of caseFiles) {
  const testCase = readJson(path.join(casesDir, name));
  const id = testCase.id ?? path.basename(name, '.json');
  const expected = testCase.expected ?? [];
  const runFile = path.join(runDir, `${id}.json`);
  if (!existsSync(runFile)) {
    totals.missingRuns += 1;
    rows.push(`${id}: no run output (${runFile})`);
    continue;
  }
  const run = readJson(runFile);
  const findings = (Array.isArray(run) ? run : run.findings ?? []).filter((f) => f.severity !== 'info');

  const unmatched = [...expected];
  let hits = 0;
  for (const finding of findings) {
    const at = unmatched.findIndex((issue) => matches(finding, issue));
    if (at !== -1) {
      unmatched.splice(at, 1);
      hits += 1;
    }
  }

  totals.found += findings.length;
  totals.real += expected.length;
  totals.matched += hits;
  if (!expected.length) {
    totals.cleanCases += 1;
    totals.falseAlarms += findings.length;
    rows.push(`${id}: clean case, ${findings.length} false alarm(s)`);
  } else {
    const missed = unmatched.map((issue) => `${issue.file}${issue.line == null ? '' : `:${issue.line}`}`);
    rows.push(
      `${id}: found ${hits} of ${expected.length} known issue(s), ${findings.length - hits} other finding(s)` +
        (missed.length ? `; missed ${missed.join(', ')}` : ''),
    );
  }
}

const percent = (part, whole) => (whole ? `${Math.round((100 * part) / whole)}%` : 'n/a');
for (const row of rows) console.log(row);
console.log('');
console.log(`precision: ${percent(totals.matched, totals.found)} (${totals.matched} of ${totals.found} findings match a known issue)`);
console.log(`recall:    ${percent(totals.matched, totals.real)} (${totals.matched} of ${totals.real} known issues found)`);
console.log(`false alarms on ${totals.cleanCases} clean case(s): ${totals.falseAlarms}`);
if (totals.missingRuns) console.log(`cases with no run output: ${totals.missingRuns}`);
