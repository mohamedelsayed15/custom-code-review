#!/usr/bin/env node
// Mechanical re-check of a review's findings before they are shown.
//
//   node <skill-dir>/scripts/check-findings.mjs findings.json
//
// Input is the `json` output of the skill (reference/templates.md). For each
// finding it confirms that:
//   - the file exists inside the repository at the revision the finding names,
//   - the line is a real line of that file,
//   - the optional `evidence` text (a short quote from the code) appears within
//     EVIDENCE_WINDOW lines of `line` (anywhere in the file when `line` is
//     null), ignoring whitespace,
//   - severity and confidence use the allowed values,
//   - no two findings share the same file, side, line and title.
// It does not judge whether a finding is right; it only catches a wrong
// location or a misquote, which are the mistakes a reader cannot see.
//
// Which version of the file is read:
//   - `side: "old"` (a deleted or changed-away line): `rev`, else the report's
//     `base`, which is the merge-base of the base branch and the reviewed
//     head. One of them is required.
//   - `side: "new"` or no side: `rev`, else the report's `head`, else the
//     working tree.
// Paths are relative to the repository root, wherever the script is run from.
// Exit code 1 when anything fails, 2 when the input cannot be used.

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const EVIDENCE_WINDOW = 3;
const SEVERITIES = new Set(['P0', 'P1', 'P2', 'P3', 'info']);
const CONFIDENCES = new Set(['confirmed', 'conditional']);
const SIDES = new Set(['new', 'old']);

const squash = (text) => String(text).replace(/\s+/g, '');

// A trailing newline ends the last line; it does not start another one.
const toLines = (text) => {
  const lines = text.split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines;
};

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('usage: check-findings.mjs <findings.json>');
  process.exit(2);
}

const git = (args) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

let root;
try {
  root = git(['rev-parse', '--show-toplevel']).trim();
} catch {
  console.error('not inside a git repository; run this from the repository under review');
  process.exit(2);
}

let report;
try {
  report = JSON.parse(readFileSync(inputPath, 'utf8'));
} catch (error) {
  console.error(`cannot read ${inputPath}: ${error.message}`);
  process.exit(2);
}
const findings = Array.isArray(report) ? report : report.findings;
if (!Array.isArray(findings)) {
  console.error('no "findings" array in the input');
  process.exit(2);
}

// Each revision is resolved once, so a bad one is reported as such and not as
// a missing file.
const badRevs = new Map();
const revProblem = (rev) => {
  if (!badRevs.has(rev)) {
    let problem = null;
    try {
      git(['rev-parse', '--verify', '--quiet', `${rev}^{commit}`]);
    } catch {
      problem = `revision "${rev}" does not exist`;
    }
    badRevs.set(rev, problem);
  }
  return badRevs.get(rev);
};

// Returns the file's lines, or a string saying why it cannot be read.
const lineCache = new Map();
const linesOf = (file, rev) => {
  const key = `${rev ?? ''}\0${file}`;
  if (!lineCache.has(key)) {
    let result;
    try {
      if (rev) {
        // Git paths use forward slashes on every platform.
        const object = `${rev}:${file.split(path.sep).join('/')}`;
        const type = git(['cat-file', '-t', object]).trim();
        result = type === 'blob'
          ? toLines(git(['cat-file', 'blob', object]))
          : `is not a file at ${rev}`;
      } else {
        const resolved = path.join(root, file);
        result = statSync(resolved).isFile()
          ? toLines(readFileSync(resolved, 'utf8'))
          : 'is not a file';
      }
    } catch (error) {
      result = rev
        ? `does not exist at ${rev}`
        : error.code === 'ENOENT'
          ? 'does not exist in the working tree'
          : `cannot be read (${error.code ?? error.message})`;
    }
    lineCache.set(key, result);
  }
  return lineCache.get(key);
};

const problems = [];
const seen = new Set();

findings.forEach((f, index) => {
  const label = `#${index + 1} ${f.title ?? '(no title)'}`;
  const fail = (why) => problems.push(`${label}: ${why}`);

  if (!SEVERITIES.has(f.severity)) fail(`severity "${f.severity}" is not P0-P3 or info`);
  if (!CONFIDENCES.has(f.confidence)) {
    fail(`confidence "${f.confidence}" is not confirmed or conditional`);
  }
  if (f.score != null && !(Number.isInteger(f.score) && f.score >= 0 && f.score <= 100)) {
    fail(`score ${JSON.stringify(f.score)} is not an integer from 0 to 100`);
  }
  if (f.evidence != null && squash(f.evidence) === '') {
    fail('the quoted evidence is empty');
  }

  const side = f.side ?? 'new';
  if (!SIDES.has(side)) {
    fail(`side "${f.side}" is not new or old`);
    return;
  }

  const key = `${f.file}:${side}:${f.line}:${f.title}`;
  if (seen.has(key)) fail('duplicate of an earlier finding');
  seen.add(key);

  // A finding about a design or a process has no location.
  if (!f.file) return;

  const file = path.relative(root, path.resolve(root, f.file));
  if (file === '' || file.startsWith('..') || path.isAbsolute(file)) {
    fail(`${f.file} is outside the repository`);
    return;
  }
  const where = (line) => `${file}${line == null ? '' : `:${line}`}${side === 'old' ? ' (old side)' : ''}`;

  const rev = f.rev ?? (side === 'old' ? report.base : report.head);
  if (side === 'old' && !rev) {
    fail(`${where(f.line)}: an old-side finding needs "rev" or a top-level "base"`);
    return;
  }

  const badRev = rev && revProblem(rev);
  if (badRev) {
    fail(badRev);
    return;
  }

  const lines = linesOf(file, rev);
  if (typeof lines === 'string') {
    fail(`${file} ${lines}`);
    return;
  }

  if (f.line == null) {
    if (f.evidence && !squash(lines.join('\n')).includes(squash(f.evidence))) {
      fail(`the quoted evidence is not anywhere in ${where(null)}`);
    }
    return;
  }
  if (!Number.isInteger(f.line) || f.line < 1 || f.line > lines.length) {
    fail(`${where(f.line)} is not a line of the file (it has ${lines.length})`);
    return;
  }

  if (f.evidence) {
    const from = Math.max(0, f.line - 1 - EVIDENCE_WINDOW);
    const to = Math.min(lines.length, f.line + EVIDENCE_WINDOW);
    const window = squash(lines.slice(from, to).join('\n'));
    if (!window.includes(squash(f.evidence))) {
      fail(`the quoted evidence is not within ${EVIDENCE_WINDOW} lines of ${where(f.line)}`);
    }
  }
});

if (problems.length) {
  console.error(`${problems.length} problem(s) in ${findings.length} finding(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`${findings.length} finding(s): locations and quotes check out`);
