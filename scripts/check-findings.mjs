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
//     EVIDENCE_WINDOW lines of `line`, ignoring whitespace. When it does not,
//     the file is searched: a quote found exactly once is reported with its
//     real line, and a quote found nowhere or in several places fails. With
//     `line: null`, the quote must appear exactly once in the file.
//     `<redacted>` in a quote stands for any text, so a secret is never quoted,
//   - severity and confidence use the allowed values,
//   - no two findings share the same file, side, line and title.
// When the report has a `base`, it also confirms that every changed file is
// listed in `coverage` (in_depth, skimmed or not_reviewed). A listed path that
// ends in `/` covers every file under it.
// It does not judge whether a finding is right; it only catches a wrong
// location, a misquote or a forgotten file, which a reader cannot see.
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
const REDACTED = '<redacted>';
const SEVERITIES = new Set(['P0', 'P1', 'P2', 'P3', 'info']);
const CONFIDENCES = new Set(['confirmed', 'conditional']);
const SIDES = new Set(['new', 'old']);
const COVERAGE_LISTS = ['in_depth', 'skimmed', 'not_reviewed'];

const squash = (text) => String(text).replace(/\s+/g, '');
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

// Every place the quote appears, as 1-based line ranges. Whitespace is
// ignored, and `<redacted>` matches any text.
const findQuote = (lines, evidence) => {
  let text = '';
  const lineAt = [];
  lines.forEach((line, index) => {
    const squashed = squash(line);
    text += squashed;
    for (let i = 0; i < squashed.length; i += 1) lineAt.push(index + 1);
  });
  const pattern = new RegExp(
    squash(evidence).split(REDACTED).map(escapeRegExp).join('.+?'),
    'g',
  );
  const hits = new Map();
  let match;
  while ((match = pattern.exec(text))) {
    const from = lineAt[match.index];
    if (!hits.has(from)) hits.set(from, lineAt[match.index + match[0].length - 1]);
    pattern.lastIndex = match.index + 1;
  }
  return [...hits].map(([from, to]) => ({ from, to }));
};

const lineList = (hits) => hits.map((h) => h.from).join(', ');

const problems = [];
const notes = [];
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
  const hasEvidence = f.evidence != null;
  if (hasEvidence && squash(String(f.evidence).replaceAll(REDACTED, '')) === '') {
    fail(`the quoted evidence has no text besides whitespace or ${REDACTED}`);
    return;
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

  if (f.line != null && (!Number.isInteger(f.line) || f.line < 1 || f.line > lines.length)) {
    fail(`${where(f.line)} is not a line of the file (it has ${lines.length})`);
    return;
  }
  if (!hasEvidence) return;

  const hits = findQuote(lines, f.evidence);
  if (hits.length === 0) {
    fail(`the quoted evidence is not anywhere in ${where(null)}`);
    return;
  }
  if (f.line == null) {
    if (hits.length > 1) {
      fail(`the quoted evidence appears at lines ${lineList(hits)} of ${where(null)}; quote more, or give "line"`);
    } else {
      notes.push(`${label}: the quoted evidence is at ${where(hits[0].from)}`);
    }
    return;
  }
  const near = hits.some(
    (h) => h.from >= f.line - EVIDENCE_WINDOW && h.to <= f.line + EVIDENCE_WINDOW,
  );
  if (near) return;
  if (hits.length === 1) {
    fail(`the quoted evidence is at ${where(hits[0].from)}, not within ${EVIDENCE_WINDOW} lines of line ${f.line}`);
  } else {
    fail(`the quoted evidence is not within ${EVIDENCE_WINDOW} lines of ${where(f.line)}; it appears at lines ${lineList(hits)}`);
  }
});

// Every changed file must be accounted for in `coverage`.
let changedCount = 0;
if (!Array.isArray(report) && report.base && !revProblem(report.base)) {
  const listed = COVERAGE_LISTS.flatMap((name) => report.coverage?.[name] ?? [])
    .map((entry) => (typeof entry === 'string' ? entry : entry?.path))
    .filter(Boolean)
    .map((entry) => path.posix.normalize(entry.replaceAll('\\', '/')).replace(/^\.\//, ''));
  const covered = (file) =>
    listed.some((entry) => (entry.endsWith('/') ? file.startsWith(entry) : file === entry));

  let changed;
  try {
    const diff = report.head
      ? git(['-C', root, 'diff', '--name-only', report.base, report.head])
      : git(['-C', root, 'diff', '--name-only', report.base]) +
        git(['-C', root, 'ls-files', '--others', '--exclude-standard']);
    changed = [...new Set(diff.split('\n').filter(Boolean))];
  } catch (error) {
    problems.push(`coverage: cannot list the changed files (${error.message.split('\n')[0]})`);
    changed = [];
  }
  changedCount = changed.length;
  const missing = changed.filter((file) => !covered(file));
  if (missing.length) {
    problems.push(
      `coverage: ${missing.length} changed file(s) are not in coverage.in_depth, skimmed or not_reviewed:\n` +
        missing.map((file) => `      ${file}`).join('\n'),
    );
  }
}

for (const note of notes) console.log(`  note: ${note}`);
if (problems.length) {
  console.error(`${problems.length} problem(s) in ${findings.length} finding(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
const coverageLine = changedCount ? `; all ${changedCount} changed file(s) are in coverage` : '';
console.log(`${findings.length} finding(s): locations and quotes check out${coverageLine}`);
