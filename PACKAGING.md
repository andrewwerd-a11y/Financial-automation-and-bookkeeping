# Packaging (ZIP)

Use this command from repo root to produce a distributable ZIP bundle:

```bash
./scripts/package_zip.sh
```

Output:
- `dist/phase0-financial-platform.zip`

Exclusions:
- `.git`
- `node_modules`
- local SQLite DB files
- generated export CSVs
- uploaded local evidence files
