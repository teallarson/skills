# HTML artifact

Example of the target structure and tone: https://9b04968f857642fd.flypod.dev/

## Build it

Fill [report.html](report.html) from the running notes. It must stay one self-contained file with no external dependencies.

- **Masthead:** kicker (area · Code Review), title, meta row (PR, ticket, author, +/-, files, package).
- **Verdict badge:** "Ship", "A few asks", or "Needs changes", plus a lead sentence.
- **The one thing to weigh:** the central tension, as one paragraph.
- **Findings at a glance:** table linking to each card (`#f1`, `#f2`, …), bugs first.
- **The findings:** numbered cards with `where`, a `<dl>` of sections (see [tone.md](tone.md)), and an **Ask**.
- **What's solid:** one closing paragraph that says whether anything blocks merge.
- **Footer:** repo#PR, short commit SHA, finding counts by severity.

Write it to a local path such as `pr-review-<number>.html`. If the impeccable skill is installed, run `/impeccable polish <path>`. Give the user the path.

## Length budgets

Keep body copy under about 800 words, roughly three minutes of reading.

| Section | Budget |
|---|---|
| Verdict lead | 2 sentences |
| The one thing to weigh | 1 paragraph, ≤ 120 words |
| Finding `What` | ≤ 60 words |
| Extra `<dl>` section | At most one, Major or Bug only |
| Finding `Ask` | ≤ 40 words, one question |
| Checked, not findings | 1 line each, ≤ 5 items |
| What's solid | 1 paragraph, ≤ 80 words |

When over budget, delete the section that repeats something the reader already has. Trimming words rarely gets there.

## Deploy to flypod

Ask the user first, in either mode. The site is public and anonymous, and it shows internal paths and code.

flypod needs no account or token. Save the file as `index.html` in its own folder so it serves at the root, then from that folder:

```bash
npx -y flypod .          # first deploy; prints the URL
npx -y flypod update     # new revision at the same URL
```

Sites expire after 14 days.
