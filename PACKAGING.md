# Packaging (ZIP)

Use this command from repo root to produce a distributable ZIP bundle:

```bash
./scripts/package_zip.sh
```

Output:
- `dist/phase4-reporting-export-foundation.zip`

Exclusions:
- `.git`
- `node_modules`
- local SQLite DB files
- uploaded local evidence files
- existing zip artifacts in `dist/`
