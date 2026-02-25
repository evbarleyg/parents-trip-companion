#!/usr/bin/env python3
"""Import video files from an external folder into a Dad inbox batch.

Example:
  python scripts/import_dad_videos.py \
    --source /mnt/media/dad/videos \
    --batch 2026-02-25-dad-drop-03
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import shutil
from pathlib import Path

SUPPORTED_EXTS = {".mp4", ".mov", ".m4v", ".webm"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import Dad videos from an external folder")
    parser.add_argument("--source", required=True, help="External source folder containing videos")
    parser.add_argument(
        "--batch",
        default=f"{dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%d')}-dad-drop-auto",
        help="Batch folder name under content/dad-inbox/ (default: today's UTC auto batch)",
    )
    parser.add_argument(
        "--repo-root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Repo root (default: auto-detected)",
    )
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="Scan source recursively",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show planned copies without writing",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing files in destination",
    )
    return parser.parse_args()


def iter_video_files(source: Path, recursive: bool):
    iterator = source.rglob("*") if recursive else source.glob("*")
    for path in iterator:
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTS:
            yield path


def main() -> int:
    args = parse_args()

    source = Path(args.source).expanduser().resolve()
    if not source.exists() or not source.is_dir():
        raise SystemExit(f"Source folder does not exist or is not a directory: {source}")

    repo_root = Path(args.repo_root).expanduser().resolve()
    dest = repo_root / "content" / "dad-inbox" / args.batch / "videos"

    videos = sorted(iter_video_files(source, args.recursive), key=lambda p: p.name.lower())
    if not videos:
        print("No supported video files found. Nothing to import.")
        return 0

    copied = []
    skipped = []

    if not args.dry_run:
        dest.mkdir(parents=True, exist_ok=True)

    for src in videos:
        target = dest / src.name
        if target.exists() and not args.overwrite:
            skipped.append({"source": str(src), "target": str(target), "reason": "exists"})
            continue

        if args.dry_run:
            copied.append({"source": str(src), "target": str(target), "dry_run": True})
            continue

        shutil.copy2(src, target)
        copied.append({"source": str(src), "target": str(target), "bytes": target.stat().st_size})

    result = {
        "batch": args.batch,
        "source": str(source),
        "destination": str(dest),
        "copied": copied,
        "skipped": skipped,
        "summary": {
            "found": len(videos),
            "copied": len(copied),
            "skipped": len(skipped),
            "recursive": bool(args.recursive),
            "dry_run": bool(args.dry_run),
            "overwrite": bool(args.overwrite),
            "timestamp_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        },
    }

    if not args.dry_run:
        manifest_path = dest.parent / "video-import-manifest.json"
        manifest_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(f"Wrote manifest: {manifest_path}")

    print(json.dumps(result["summary"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
