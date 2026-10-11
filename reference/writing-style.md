# Writing style: plain technical English

Every text this skill writes for a reader follows these rules. They are inspired by ASD-STE100. Read this file before you write the review.

## Where the rules apply

- **Apply them to:** the text review, the PR comment, the fix questions and their options, the string fields in `json` output (`title`, `problem`, `impact`, `recommendation`, `open_questions`, `note`), entries in the knowledge files, and replies about the review.
- **Do not apply them to:** code, quoted evidence, commands, file paths, identifiers, error messages, quoted `AGENTS.md` rules and product names. Copy these exactly. They are technical names, and they are always permitted. The one exception: replace a secret value with `<redacted>`.

These rules are the skill's own. Do not say that a review complies with any standard. If a rule would make a statement less precise, keep the precise technical term and split the sentence instead.

## Words

- **Use simple, common words.** Use one word for one meaning, and use the same word for the same thing in the full review. If you call it a "tenant" once, do not call it an "organization" later.
- **Use technical names and technical verbs** when they are the correct term: `index`, `transaction`, `race condition`, `deadlock`, `deploy`, `migrate`, `commit`, `roll back`.
- **Use the simple word,** not the complex one:

  | Do not write | Write |
  |---|---|
  | utilize, leverage | use |
  | ensure | make sure |
  | in order to | to |
  | prior to, subsequent to | before, after |
  | multiple, numerous | more than one, many |
  | additional | more |
  | sufficient | enough |
  | terminate, commence | stop, start |
  | approximately | about |
  | in the event that | if |
  | due to the fact that | because |
  | it is possible that X | X can |

- **Do not use slang, idioms or review jargon:** "nit", "LGTM", "footgun", "smell", "bikeshed", "low-hanging fruit". Write the plain meaning.
- **Do not use contractions.** Write "do not", not "don't".
- **Keep noun clusters to three words or fewer.** Write "the error message for a failed tenant check", not "tenant scope validation failure message". Technical names do not count, for example `UserRoleAssignmentService`.

## Verbs

- **Use simple tenses:** present, past and future ("will"). Use the imperative for instructions.
- **Use the active voice.** Write "The guard rejects the request", not "The request is rejected by the guard". Use the passive only in descriptions, and only when the actor is unknown or not important.
- **Do not use "-ing" forms,** except in technical names ("rolling deployment", "connection pooling"). Write "When the job tries again", not "When retrying".
- **Use the verb, not a noun made from it.** Write "validate the input", not "perform validation of the input".
- **Say how certain you are with plain verbs.** Use "does" or "will" for a confirmed result and "can" for a possible one. Do not stack hedges such as "might possibly". The confidence label carries the uncertainty (SKILL.md Section 2.3).

## Sentences and paragraphs

- **Instructions:** at most 20 words, with one instruction in each sentence. Put a condition before the instruction: "If the table is large, create the index concurrently."
- **Descriptions:** at most 25 words, with one topic in each sentence.
- A code span counts as one word.
- **Keep the articles** ("a", "an", "the"). Do not remove them to make a sentence shorter.
- **Use a vertical list** for steps or for more than two items, and put a colon before it.
- **Paragraphs:** one topic each, at most six sentences. Put the most important information first: the defect and its trigger before the background.

## The review format in plain technical English

- **Title:** a short statement of the defect, not a category. Example: `[P1] Two withdrawals at the same time can overdraw an account`.
- **Problem:** what the code does and when. Start with the trigger: "When two requests…".
- **Impact:** what goes wrong, and for whom.
- **Recommendation:** instructions in the imperative, one action in each sentence. Write about the code, not about the author: "Add a unique index on `grants(user_id, role_id)`", not "You should add…".
- **Confidence:** "Confirmed." or "Conditional: <the assumption>."
- **Open questions:** one direct question each.
- **Warnings** (an action that can cause damage, for example a migration or a data fix): start with a clear command, then give the reason. "Do not run this migration before the backfill. The new constraint will fail on the existing rows."

## Example

Before (one sentence of 44 words, five "-ing" forms, stacked hedges, and a description and an instruction mixed together):

> It seems that the newly introduced caching layer might potentially be returning stale tenant configuration data in scenarios where an admin is updating settings, which could lead to users seeing incorrect behavior, so we should probably consider invalidating the cache entry upon settings update.

After:

> **Problem:** When an admin changes the tenant settings, the cache keeps the old values until the entry expires.
>
> **Impact:** During that time, users of that tenant get the old behavior.
>
> **Recommendation:** Delete the tenant's cache entry after the settings update commits.
