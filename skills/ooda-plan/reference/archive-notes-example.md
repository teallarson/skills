# Example: archive notes

A plan for "Let users archive notes", with Slice 0 written in full.

```text
## Plan: Archive notes

**Outcome.** A signed-in user can archive a note and see it disappear from their main list.
**Non-goals.** Unarchive, bulk archive, an archived-notes view.
**Key risks / unknowns.** The list query already filters deleted notes; check whether archiving can use the same filter.

### Slice 0: Walking skeleton — Archiving a hardcoded note removes it from the list
**Observe.** Read `notes/list.tsx` and `api/notes/list.ts` to confirm the current query.
**Orient.** The list already filters `deleted_at IS NULL`; an `archived_at` column can use the same filter.
**Decide.** Add an `archived_at` column, a `POST /notes/:id/archive` endpoint that sets it, and one button wired to a hardcoded note id. Skip auth, errors, and optimistic UI.
**Act.** Migration for `archived_at`; endpoint sets the timestamp; list query filters `archived_at IS NULL`; button calls the endpoint and refetches.
**Acceptance criteria.**
- Given note 1 exists and is not archived, when I click Archive on it, then it disappears from the list after one refetch.
- Given I reload the page, then the archived note stays hidden.
**Verification signal.** `curl -XPOST localhost:3000/notes/1/archive` returns 204; reloading the app shows one fewer note.

### Slice 1: Any note can be archived from its row
...

### Slice 2: Archiving respects auth and permissions
...
```
