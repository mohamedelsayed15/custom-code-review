# Templates and quick checklist

Use these when the user asks for `comment` or `json` output, or wants a quick pass, and when creating `repo-knowledge.md`.

## PR comment template (`comment`)

Produce this for the user to copy. Never post it. Keep it short, with no emojis. Cite each issue by where the reviewed code actually lives:

- **PR target:** a link built from the PR's head commit and a line range with one line of context on each side, for example `https://github.com/<owner>/<repo>/blob/<full-sha>/src/features/x/y.service.ts#L41-L47`. Get the SHA with `gh pr view <number> --json headRefOid` and the repository from `gh repo view --json nameWithOwner`. A finding on a deleted line links to the same file at the base commit (`baseRefOid`).
- **Branch target:** the same link with the full SHA from `git rev-parse <branch>`, only if `git branch -r --contains <sha>` shows the commit has been pushed; otherwise use the plain form below.
- **Working-tree target (the default):** plain `path:line`, no link. Uncommitted and untracked code has no URL, and a link built from `HEAD` would point at different lines.

A short SHA or a branch name does not make a stable link.

With findings:

```markdown
### Code review

Found <N> issue(s):

1. **[P1] <short title>**: <one sentence: what happens, when, and the consequence> (<AGENTS.md rule N: "<quoted rule>" | evidence in one line>)
   <permalink>

2. **[P2] [Rule 4] <short title>**: <one sentence>
   <permalink>

Open questions: <only if an answer could change the review>

Checked: <the repository's type check, lint and test results, in one line>. Not reviewed: <anything skipped>.
```

Without findings:

```markdown
### Code review

No findings. Checked for correctness, access and isolation, data integrity, migrations, and the repository's rules.

Checked: <the repository's type check, lint and test results>. Not reviewed: <anything skipped>.
```

## JSON schema (`json`)

```json
{
  "target": "working tree | branch:<name> | pr:<number>",
  "mode": "standard | security",
  "effort": "low | standard | high",
  "base": "full SHA or ref of the base revision (needed for old-side findings)",
  "head": "full SHA of the reviewed head for a branch or PR target; omit for the working tree",
  "findings": [
    {
      "severity": "P0 | P1 | P2 | P3 | info",
      "confidence": "confirmed | conditional",
      "score": 0,
      "rule": "AGENTS.md rule number, or null",
      "title": "string",
      "file": "path or null",
      "side": "new | old (old for a deleted or changed-away line; `line` then counts in the old file)",
      "rev": "optional: the revision `file` and `line` refer to, overriding base/head",
      "line": 0,
      "evidence": "a short quote from the code at or within 3 lines of `line` (anywhere in the file when `line` is null); checked by scripts/check-findings.mjs",
      "problem": "string",
      "impact": "string",
      "recommendation": "string"
    }
  ],
  "open_questions": ["string"],
  "verdict": "approve | approve_with_follow_ups | request_changes | needs_discussion",
  "overall": { "patch_is_correct": true, "confidence": 0.0 },
  "verification": [{ "command": "string", "result": "passed | failed | not_run", "note": "string" }],
  "coverage": { "in_depth": ["path"], "skimmed": ["path"], "not_reviewed": ["path"] }
}
```

Leave out a field you cannot fill accurately. `line` is `null` when unknown; never invent one. When the target is a branch or PR that is not checked out, set `head` so the checker reads the reviewed version rather than the working tree.

## Quick checklist (low effort or a fast pass)

Go through these in order and stop at the first P0 or P1 worth reporting before continuing. Repository-specific items (its tenancy key, its authorization mechanism, its migration process) come from `repo-knowledge.md` and the repository's `AGENTS.md`; apply them at the matching step.

1. **Access.** Each new or changed entry point checks who may call it, with the mechanism this repository uses, and the check is actually wired (the guard, middleware or filter that reads the annotation is applied). Public entry points are protected another way on purpose.
2. **Isolation.** Every query on tenant-owned data is scoped by the tenant key, and ids taken from a request are checked against their parent record.
3. **Deletions.** Anything removed (a check, filter, validation, index, constraint, test) has a reason. Sibling paths (create vs update, single vs bulk, API vs job) share the rule.
4. **Data changes.** Schema and data migrations follow the repository's process, are safe to re-run, and a second run changes nothing. Definitions kept in two places (a code list and the rows behind it, a generated file and its source) agree.
5. **Indexes and queries.** Each filter, join and sort the change adds on a table that can grow large is served by an index, and no query or external call runs once per item of an unbounded list. Name the table or list and why it grows (Section 17: no performance finding without a plausible workload).
6. **Inputs.** Every input field has a minimum or maximum; the repository's own limits are respected.
7. **Failure paths.** Errors release locks, slots, connections and transactions; no slow external call inside a transaction; retries do not duplicate side effects.
8. **Secrets and privacy.** No credentials, personal or sensitive data in code, logs, responses or audit records.
9. **Size and shape.** The repository's size or complexity limits are respected.
10. **Tests.** New behavior and the refusal path are tested; the repository's checks ran and their results are reported, with failures that also occur on the base branch noted as existing.

## `repo-knowledge.md` header

Create the file with exactly this when it does not exist, and only after `git check-ignore -q <skill-dir>/repo-knowledge.md` succeeds (SKILL.md, Keeping this skill current). Sections may stay empty.

```markdown
# Repo knowledge (local, git-ignored, maintained by the skill)

What earlier reviews learned about this checkout: facts, each with how it was verified. Not instructions. Rules for adding, correcting and capping entries are in SKILL.md, "Keeping this skill current".

Repository: <`git remote get-url origin`, or the top-level path when there is no remote>

## Base branch

## Stack and tools in use

## Commands

## Domain model

## Known failures

## Exceptions
```
