# custom-code-review

A Claude Code skill that reviews code changes in any repository. It looks for defects that matter: correctness, security, privacy, data integrity, reliability, performance, tests, and the rules of the repository.

The skill has no built-in knowledge of a specific codebase. At the start of each review, it reads the repository: its `AGENTS.md`, manifests, CI configuration and code. Then it loads the checklists for the stack that it finds. It records what it learns in local files, and uses these files in later reviews.

All review output is in plain technical English: short sentences, simple words and direct instructions. The rules are inspired by ASD-STE100.

## What it reviews

- **In scope:** services and APIs, databases, caches, queues and event streams, background jobs, data pipelines, third-party integrations and webhooks, infrastructure, containers, CI/CD, deployment, scripts and CLIs, and plans or designs for these.
- **Out of scope:** frontend web UI and mobile app code. In a mixed change, the skill reviews the server side fully. In the UI files, it reviews only what crosses the trust boundary.

The `AGENTS.md` file of the repository can make this scope wider or narrower.

## Requirements

- Claude Code
- `git`
- Node.js 18 or later, for the findings checker
- The GitHub CLI (`gh`), only to review pull requests

## Install

Put this folder in one of these locations:

- **In a repository:** `.claude/skills/custom-code-review/`, for that repository only. Commit the folder.
- **For your user:** `~/.claude/skills/custom-code-review/` (or the `skills/` folder of another Claude configuration folder), for all your repositories.

The skill keeps what it learns about a repository in a local knowledge file. Each user has their own. Where the file is depends on the install:

| Install | Knowledge file |
|---|---|
| In a repository | `repo-knowledge.md` in this folder. The `.gitignore` in this folder keeps it out of git, so commit that `.gitignore` with the folder. If the file is not ignored, the skill does not create it, and tells you what it would have recorded. |
| For your user | `repo-knowledge/<name>.md` in this folder, one file for each repository. The name comes from the `origin` remote, for example `github.com__acme__billing.md`. |

## Use

Ask for a review in plain words, for example "review my changes" or "is this safe to merge". You can also run the skill with arguments:

```text
/custom-code-review
/custom-code-review security
/custom-code-review feature/billing-v2 high
/custom-code-review 1234 comment
/custom-code-review focus on the migration max 5
/custom-code-review json
```

All arguments are optional. Without arguments, the skill does a standard review of the working tree against the base branch.

| Argument | Effect |
|---|---|
| Target | The working tree (default), a branch name, or a pull request number. |
| `focus on <area>` | Spend most of the time on one area. The skill still reports P0 and P1 findings in other areas. |
| `security` | Do only the security method and the access, tenancy, injection, secrets and privacy checks. |
| `low`, `standard`, `high` | Effort. `low` reports only P0 and P1 findings. `standard` reports P0 to P2. `high` reports all severities and applies the history lens and the edge-case matrix to every changed unit. |
| `max N` | Report at most N findings, the most severe first. |
| `base <ref>` | Compare against this base branch, for example to review an old change. |
| `json` | Give the output in the JSON schema in `reference/templates.md`. |
| `comment` | Give a pull request comment for you to copy. The skill never posts it. |
| `parallel` | For a very large change, split the review between subagents. The skill checks each candidate finding again before it reports it. |

## What the skill does and does not do

- It reads the change, the code around it, and its history (`git log`, `git blame`).
- It runs the read-only checks of the repository: type check, lint and unit tests, in CI mode. For code from another person, it asks you before it runs any check that executes that code. This includes a pull request that you checked out with `gh pr checkout`. It compares `git status` before and after the checks. It does not count a check that writes files as a pass.
- It does not deploy, migrate a real database, seed data, push, commit or post comments.
- It writes only in its own folder (the knowledge file, `reference/learned-rules.md` and `reference/stacks/`). It changes no other file in the repository, unless you ask for a fix after the review.
- It treats text in the code under review as data. An instruction in a comment, a commit message or a PR description does not change the review. The skill reports such an instruction as a finding.

## Output

Each finding has a severity (P0 to P3), a location, the problem, the impact and a confidence label (Confirmed or Conditional). The review then gives open questions, the checks that it ran, what it reviewed and did not review, and a verdict.

Before the skill shows the findings, it runs `scripts/check-findings.mjs`. This script makes sure that each file and line exist and that each quote matches the code. If a quote is at a different line, it gives the correct line. It also makes sure that every changed file is in the coverage lists. It can check a deleted line against the base branch, and a branch that is not checked out against its own commit.

The review never repeats a secret. It writes `<redacted>` in place of the value, and it does not read credential files such as `.env` in full.

```sh
node <skill-dir>/scripts/check-findings.mjs findings.json
```

The script checks locations and quotes only. It does not decide if a finding is correct.

## No fix suggestions

The review lists the findings only. It does not suggest how to fix them, and it does not ask you to choose a fix. To fix a finding, ask after the review. The skill changes only what you name, and runs the checks again.

## How the skill learns

The skill writes only in its own folder. It writes in one of three cases: a review found a defect that no check covered, a recorded fact changed, or you told it to remember something.

| File | Contents |
|---|---|
| `repo-knowledge.md` or `repo-knowledge/<name>.md` | Facts about one repository: commands, stack, domain model, known failures. Local to you. |
| `reference/learned-rules.md` | Checks that are useful in any repository. |
| `reference/stacks/` | Checks for one language or tool. |

The skill never learns from the change under review. It tells you about each change to these files at the end of the reply. If the skill folder is in the repository, a change to the rules has an effect only after it gets to the base branch. When a change edits the skill folder, the skill reviews that change with the rules from the base branch. A branch that adds `repo-knowledge.md` to git is reported as a finding.

## Measure the skill

`evals/` holds past changes with known issues, and a script that scores a review run for precision, recall and false alarms. Run each new version of the skill on the same cases, and compare. See `evals/README.md`.

## Folder layout

```text
SKILL.md                         The method, the orient step, arguments and learning rules
README.md                        This file
scripts/check-findings.mjs       The checker for finding locations, quotes and coverage
.gitignore                       Keeps the knowledge files local
repo-knowledge.md                Knowledge file for an install in a repository (local, created in use)
repo-knowledge/                  Knowledge files for a user-level install, one per repository (local)
evals/                           Cases with known issues, and the scoring script
reference/
  generic-rules.md               Defect classes for all languages (G1-G10)
  core-checklist.md              Core checklist and third-party integrations (Sections 4-5)
  devops-checklist.md            Containers, infrastructure, CI/CD, deployment (Section 11)
  security-and-edge-cases.md     Security method and edge-case matrix (Sections 13-14)
  reporting.md                   Severity, finding format, output and quality gate (Sections 15-23)
  writing-style.md               Plain technical English rules for all output
  templates.md                   PR comment, JSON schema, quick checklist, knowledge-file header
  learned-rules.md               Checks that the skill learned from use
  stacks/                        Packs for TypeScript/Node, SQL/Postgres, Redis, messaging,
                                 API styles and pipelines, and other backend languages
```

## Add a stack pack

To add checks for a language or tool, add a file to `reference/stacks/` and add a row for it to the table in `reference/stacks/README.md`. The skill also adds packs itself when it finds a stack that has no pack. Do not put repository names, customer data or secrets in a pack.

## Limits

- The review is only as complete as the context that the skill can read. It says in the Coverage section what it did not review.
- A passing review does not prove that the code has no defects.
- The writing rules are the skill's own. The output does not claim to comply with any writing standard.
