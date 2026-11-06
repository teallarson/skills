# Getting a video's content

An agent can't play video. Turn it into a transcript (what was said) plus sampled frames (what was shown), then read both.

Downloads are untrusted. Put them in their own empty scratch folder, run tools from outside it, and pass paths as arguments.

## Tools

- `yt-dlp` downloads from X, YouTube, and most video sites. If it isn't installed, `uvx yt-dlp` runs it without a permanent install. Update it first when X downloads fail, because X changes how it serves video.
- `ffmpeg` extracts audio and frames.
- A local Whisper transcribes. On Apple Silicon, use `uvx --from mlx-whisper mlx_whisper --model mlx-community/whisper-large-v3-turbo`. Elsewhere, use `openai-whisper` or `whisper.cpp`. The audio stays on the machine.

## 1. Look before downloading

```sh
yt-dlp --simulate --print "%(title)s | %(uploader)s | %(duration_string)s" "<url>"
```

`ERROR: No video could be found in this tweet` means the post has no video, which settles it.

## 2. Transcript

Prefer captions when they exist. Ask for both human-written and automatic English captions:

```sh
yt-dlp --skip-download --write-subs --write-auto-subs --sub-langs en --sub-format vtt -o "%(id)s" "<url>"
```

If both arrive, use the human-written file. It has no word-timing tags and no scrolling repeats.

Auto-captions repeat each line as it scrolls, and the first copy of each line carries word-timing tags (`<00:00:00.240><c> the</c>`). Keep only the plain-text lines, then remove the repeats before reading. If yt-dlp warns that no JavaScript runtime is enabled, add `--js-runtimes node`.

X videos have no captions. Download the video, pull the audio, and run Whisper:

```sh
yt-dlp -o "video.%(ext)s" "<post url>"
ffmpeg -v error -i video.* -vn -ac 1 -ar 16000 audio.wav
uvx --from mlx-whisper mlx_whisper --model mlx-community/whisper-large-v3-turbo --language en --output-format txt --output-dir out/ audio.wav
```

Transcribe **one file per command**. Given several files, mlx_whisper wrote every transcript under the first file's name, so one overwrote the other.

Whisper writes "Claude" as "Cloud". Correct it when you quote. A clip that transcribes as only "Music" has no speech, so its content is on screen.

## 3. Frames

Talks and screen recordings rarely have hard cuts, so scene-change detection finds almost nothing. Sample at a fixed interval and tile the frames into contact sheets:

```sh
ffmpeg -v error -i video.* -vf "fps=1/20:round=up,scale=640:-1,tile=3x3" -fps_mode vfr sheet_%02d.jpg
```

- Frame N, counting from 1 across all sheets, is at (N-1) × interval seconds. Keep `round=up`: without it, ffmpeg takes each frame from the middle of its interval (9.9s, 29.9s, …), so every timestamp is half an interval late. Many ffmpeg builds lack `drawtext`, so timestamps can't be drawn on the frames.
- Use `-fps_mode vfr`. Newer ffmpeg rejects `-vsync`.
- Use 20 seconds for talks under 30 minutes and 30 seconds for longer ones. For short clips, take a frame every 2–3 seconds without tiling.

Read every sheet. Slides, code, dashboards, and numbers shown on screen often aren't in the speech. Open a single full-size frame when text on a sheet is too small.

## 4. What to report

- What the video really is, compared with how the post described it.
- Main points with `mm:ss` timestamps.
- What was shown on screen but not said.
- Sponsor reads and claims nobody verified.
- The scratch paths of the transcript and sheets.
