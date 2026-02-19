# Actual photo inbox

Drop newly exported family photos here first.

## Promotion workflow (safe path)

1. Add raw files to this `inbox/` folder.
2. Open `promotion-manifest.json` and create/update entries.
3. Set `approved: true` only for files you want to promote now.
4. Run:

```bash
npm run actuals:promote
npm run actuals:snippets
```

This script will:
- block screenshot/screen-recording style filenames,
- only allow `jpg/jpeg/png/webp`,
- require explicit `alt`, `caption`, and `attribution`,
- copy approved files from `inbox/` to `public/actuals/`, and
- regenerate `src/data/actualPhotoManifest.ts` whitelist.

After running, use `generated-actual-moments.snippets.md` to paste the generated `photos` blocks into `src/data/actualMoments.ts` using the same `photoId/date/momentId` values.
