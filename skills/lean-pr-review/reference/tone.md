# Report tone

Example: https://9b04968f857642fd.flypod.dev/

## Voice

- Write to the author as a colleague, not as a ticket.
- Say when you're unsure: "I can't picture how this will be used" beats false confidence.
- Open the verdict with what's good when it's earned.
- "The one thing to weigh" is one paragraph, not a list.
- End each finding with an **Ask**: a real question for the author.
- Close by saying whether anything blocks merge.

## Severity

| Chip | Use for |
|---|---|
| **Bug** | Confirmed or highly plausible wrong behavior. Include a repro or trace. |
| **Major** | Architecture concern, misleading behavior, or complexity that may not pay off. |
| **Medium** | A real issue with a likely small fix. Doesn't block. |
| **Minor** | Worth knowing; not a blocker. |
| **Footgun** | The code is defensible, but operators will hit an ugly failure on misconfig or an unusual deploy. |
| **Question** | Not a problem; you need information (intent, versioning). |

Use **Critical** only for data loss, auth bypass, or production-breaking defects.

## Finding sections

Each finding is a `<dl>`. Always include **What** (what changed) and end with **Ask**. Add others only as needed, within the budgets in [artifact.md](artifact.md):

- **Observation:** what you noticed
- **Why it matters:** user impact, accessibility, maintenance
- **Clarity:** intent the code doesn't express
- **Worth thinking about:** softer framing for a Minor
- **The question:** for a Question

## What gets a card

A finding card is for something the author should respond to: a question, a fix, or a concern. A slice item that is understood and needed stays in the conversation, unless it's worth praising in "What's solid."

## Ordering

- Order the table and cards by importance, not file order. The biggest question is #1.
- Group related nits into one finding.

## Code references

- Use `<code>` for identifiers, props, and file names.
- In the `where` line, drop paths that are obvious from context.
- Cite specific behavior ("the left ~80% toggles…"), not impressions ("the UX is confusing").
