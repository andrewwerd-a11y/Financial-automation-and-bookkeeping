# Packaging (ZIP)

Use this command from repo root to produce a distributable ZIP bundle:

```bash
./scripts/package_zip.sh
```

Output:
- `dist/phase1-core-intake-backbone.zip`

Exclusions:
- `.git`
- `node_modules`
- local SQLite DB files
- uploaded local evidence files
- existing zip artifacts in `dist/`
