# Review tone & voice

**Example:** https://9b04968f857642fd.flypod.dev/ — match this structure and voice.

See [report.html](report.html) for the HTML skeleton.

## Voice

- **Conversational, not bureaucratic.** Write like you're talking to the author over coffee, not filing a JIRA ticket.
- **Honest uncertainty is fine.** "I'm genuinely struggling to picture how this will be used" is better than fake confidence.
- **Lead with what's good.** The verdict paragraph opens with praise when it's earned.
- **One central tension.** "The one thing to weigh" is a single narrative, not a bullet list.
- **Questions, not demands.** Findings end with an **Ask** — a real question you'd want answered in conversation.
- **Blocking clarity.** Close with whether anything actually blocks merge.

## Severity scale

| Chip | When |
|------|------|
| **Major** | Architectural concern, misleading behavior, or complexity that may not pay off — worth discussing |
| **Medium** | Real issue, likely a small fix — doesn't block but should be addressed |
| **Minor** | Flag for awareness — "not a blocker" |
| **Question** | Not a problem — genuinely need info (version numbering, intent, etc.) |

Avoid **Critical** unless something is actually broken or dangerous. This is a lean review, not a security audit.

## Finding structure

Each finding uses a `<dl>` with labeled sections. Pick the labels that fit:

- **What** — what changed (always include)
- **Observation** — what you noticed on inspection
- **Why it matters** — user impact, a11y, maintainability
- **Clarity** — intent not expressed in code
- **Worth thinking about** — softer framing for minors
- **The question** — for Question-severity items
- **Ask** — always end with a conversational question (styled callout)

## What earns a finding vs. a slice note

**Finding** (in the report): something the author should respond to — a question, a suggested fix, or a concern.

**Slice note** (conversation only): "understood, earns its keep" — doesn't need a finding card unless it's worth calling out positively in "What's solid."

## Ordering

1. Table and findings ordered by **importance**, not file order
2. The biggest question is finding #1 even if it's not the first file in the diff
3. Group related nits — don't inflate the finding count

## Code references

- Use `<code>` for identifiers, props, file names inline
- `where` line lists files without paths when they're obvious from context
- Cite specific behavior ("left ~80% toggles…") not vague ("the UX is confusing")
