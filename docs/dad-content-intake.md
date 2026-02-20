# Dad Content Intake Workflow

This project supports manual enrichment from dad's raw updates:

- freeform text updates in `updates.txt`
- a photo dump in `photos/`

Use one folder per drop:

```text
content/dad-inbox/<batch-id>/
  updates.txt
  photos/
```

Recommended batch IDs:

- `2026-02-20-dad-drop-01`
- `2026-02-27-dad-drop-02`

## `updates.txt` Minimum Fields

Each update block should include:

- `Entry ID` (unique within the batch)
- `Text` (the raw update from dad)
- optional `Date Hint` (best signal for direct day match)
- optional `Place Hint` (city, region, venue)
- optional `Photo Files` (comma-separated filenames from `photos/`)
- optional `Captured At` (ISO timestamp from image metadata or message time)

Template is available at `content/dad-inbox/template/updates.txt`.

## Deterministic Allocation Rules

The allocation utility applies these rules in order:

1. `explicit_date`: assign when update text or date hint includes an explicit trip date.
2. `region_keyword`: assign only when place/region cues point to exactly one trip day.
3. `metadata_timestamp`: assign only when `Captured At` is close enough to one trip day (`<= 18h`).
4. `needs_review`: if none of the above are high-confidence, do not publish.

Uncertain items are tracked in `docs/dad-content-review.md` and excluded from day cards.

## Photo Handling

- Supported formats: `jpg`, `jpeg`, `png`, `webp`
- Move approved photos into `web/public/actuals/`
- Use stable slug names: `dad-<date>-<topic>.png`
- Provide meaningful `alt` and `caption` for every published photo

## Publish Checklist

1. Process the batch and map high-confidence entries.
2. Add unresolved entries to `docs/dad-content-review.md`.
3. Add approved moments in `web/src/data/actualMomentsDad.ts`.
4. Validate:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test --workspace web`
   - `npm run build`
