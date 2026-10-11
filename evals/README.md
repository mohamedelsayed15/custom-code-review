# Evals

A small set of past changes with known issues, to measure each version of the skill. Without it, you cannot tell if a rule change helps or hurts.

## Cases

Put one JSON file for each case in `cases/`. Use 10 to 20 cases from this repository:

- Changes with bugs that you know about: bugs found in review, bugs found later in production, and the bugs behind `reference/learned-rules.md` entries.
- Three to five clean changes with no known issue. They count the false alarms.

The format is in `cases/example.json`:

| Field | Value |
|---|---|
| `id` | A short name. The run output for the case is `<id>.json`. |
| `base` | The full SHA that the change started from (its merge-base). |
| `head` | The full SHA of the change. |
| `expected` | The known issues: `file`, `line` (or `null`), `tolerance` in lines (default 5) and a `note`. An empty list means a clean case. |

Replace `cases/example.json` with a real case.

## Run a version

For each case:

1. Make a branch at the change: `git branch eval/<id> <head>`.
2. Run the review with the same base and JSON output: `/custom-code-review eval/<id> base <base> json`.
3. Save the JSON to `runs/<version>/<id>.json`, for example `runs/2026-10-11/<id>.json`.
4. Delete the branch: `git branch -D eval/<id>`.

Then score the version:

```sh
node evals/score.mjs evals/cases evals/runs/<version>
```

The script prints, for each case, the known issues found and missed, and then the totals:

- **Precision:** the findings that match a known issue.
- **Recall:** the known issues that the review found.
- **False alarms** on the clean cases.

A finding that matches no known issue is not always wrong. Read it before you count it as a false alarm, and add it to the case if it is real.

## Notes

- Run every version on the same cases, and compare the totals.
- The skill can write to its knowledge files during a run. Discard those edits after each run (`git checkout -- reference/` and delete `repo-knowledge.md` entries that the run added), so that one run does not change the next.
- If the commits of a case have another author, the skill treats the case as untrusted. It asks before it runs tests. Answer the same way for every version.
- Cases name files and lines of this repository. Keep secrets and personal data out of the `note` fields.
