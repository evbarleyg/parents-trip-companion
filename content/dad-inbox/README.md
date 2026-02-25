# Dad Inbox

Drop each new content batch in a unique subfolder:

```text
content/dad-inbox/<batch-id>/
  updates.txt
  photos/
  videos/
```

Start from `content/dad-inbox/template/`.

## Import videos from an external server folder

Use the helper script to copy supported video files into a batch folder:

```bash
python scripts/import_dad_videos.py \
  --source /path/on/local-server/videos \
  --batch 2026-02-25-dad-drop-03
```

Notes:
- Supported extensions: `.mp4`, `.mov`, `.m4v`, `.webm`
- Add `--recursive` if your source has nested folders
- Add `--dry-run` to preview without copying
- Files land in `content/dad-inbox/<batch>/videos/`
- A `video-import-manifest.json` is written per batch
