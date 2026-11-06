---
name: readwise-digest
description: Read what the user recently saved to Readwise Reader, including videos attached to saved posts, and write a dated digest page of takeaways with a source for each point. Use when the user says "go through what I saved", "summarize my Readwise saves", "what did I save last night", or asks for takeaways from saved posts or videos. Also suits a nightly scheduled run.
argument-hint: "[since: date or 'last night'] [topic to focus on]"
---

# Readwise digest

Turn recent Readwise Reader saves into one dated page of takeaways. Each takeaway names its source. Raw text and transcripts stay in a scratch folder, not in the notes.

## Needs

- A connected Readwise tool that can list Reader documents and fetch one document's full text. Through an Arcade gateway these are `Readwise.reader_list_documents` and `Readwise.reader_get_document_details`. Use whatever equivalent the client has. If none is connected, say so and stop.
- For videos: `yt-dlp`, `ffmpeg`, and a local Whisper. See [reference/video.md](reference/video.md).

## Steps

### 1. Decide the window and the output

- **Window:** use what the user said. If they said nothing, use the `saved_until` value from the newest existing digest page in the output folder. If there is no earlier digest, use the last 24 hours.
- **Output folder:** use what the user named. Otherwise, if `~/.agents/agent-context` exists, use the `Research/` folder in the vault that contains it. Otherwise ask.
- **Focus:** if the user named a topic (for example "efficient work between agents and humans"), keep only takeaways about it and say what you left out.

### 2. List what was saved

List documents updated after the window start, all categories. Readwise filters by update time, so drop anything whose `saved_at` falls outside the window. Report the list (title, author, category, saved time) before reading. Feed items the user did not save are noise; leave out `location: feed` unless asked.

If nothing is new, say so and stop. On a scheduled run, write nothing.

### 3. Read each item

Send this reading to subagents, one per item or a few items each, so the full text never enters the main session. Each subagent returns the takeaways, the claims it couldn't verify, and whether the item has a video. If the client can choose a model per subagent, a mid-size model is enough here.

For each item:

- Fetch the full text. Saved X threads often embed a long quoted article. That article usually carries the substance, while the post on top is hype. Judge them separately.
- If the stored text is cut off, say so. Don't guess the missing part.
- Look for videos. In Readwise's text, an attached video shows up as "Your browser does not support the video tag." For any saved item that links a video, follow [reference/video.md](reference/video.md).
- Check each post's claim about its video against the video itself. Posts often mislabel what the video is.

### 4. Write the digest

Synthesis is the one step that needs the strongest model, and it reads only the subagents' reports.

Write `<Output folder>/Readwise digest — YYYY-MM-DD.md`:

```markdown
---
type: research
updated: YYYY-MM-DD
saved_until: <ISO time of the newest item covered>
tags: [research, readwise]
---

# Readwise digest — YYYY-MM-DD

## Sources
- Author, "Title" — [link](source_url). One line on what it really is (product pitch, study summary, tutorial).

## Takeaways
### <theme>
- The takeaway, in plain words. (Author or video mm:ss)

## Unverified or hype
- Claims that come only from the author, are sponsored, or that a source contradicts.
```

Group takeaways by theme, not by source. A takeaway several sources share goes in once and names all of them. Keep numbers attached to whoever claimed them.

Never put raw transcripts, full article text, or copied pages in the notes. Leave them in the scratch folder and give the path in your reply.

### 5. Finish

- If the notes folder is a git repo, commit only the new page with an explicit path. Never use `git add -A`. Push only if the repo's own instructions say to.
- In the reply, give the page path, the item count, which videos you watched and how (captions, Whisper, frames), and anything you could not read.
- If a takeaway changes how the user works, propose the change. Don't apply it on your own.

## Scheduled runs

Run unattended, nightly. Write the page only if something new was saved. Don't change settings, rules, or skills; those changes come back to the user as proposals.
