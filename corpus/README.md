# Chatbot corpus

The documents the assistant answers from.

- `*.pdf` — third-party reference documents.
- `categories/`, `subcategories/` — symlinks to the platform's explanations in `tools/seed/src/data/base/explanations/`, so the assistant knows what the app itself shows.
- `manifest.json` — the label, scope and citation URL for each PDF, and the explanation folders to include.

To add a document, drop it here and list it in `manifest.json`. To ingest everything:

```bash
pnpm chatbot:ingest-corpus
```

See the [runbook](../docs/operations/runbook.md#ingesting-the-whole-corpus-folder).
