# Dev Notes

## WebStorm File Watcher: sync root README

Goal: run `npm run sync:readme` when `/README.md` is saved, without triggering from `Leaflet.Polydraw/README.md`.

1. Open the project root in WebStorm (repo root, the folder containing `README.md` and `Leaflet.Polydraw/`).
2. Go to `Settings/Preferences -> Tools -> File Watchers`.
3. Create a watcher: `+ -> Custom`.

### Watcher fields

| Field | Value |
| --- | --- |
| Name | `Sync Root README -> Leaflet.Polydraw` |
| File type | `Markdown` |
| Scope | `Custom` |
| Scope pattern | `file:README.md&&!file:Leaflet.Polydraw/README.md` |
| Program | `npm` |
| Arguments | `run sync:readme` |
| Working directory | `$ProjectFileDir$/Leaflet.Polydraw` |

### Advanced options

| Option | Value |
| --- | --- |
| Auto-save edited files to trigger the watcher | `Off` |
| Trigger the watcher on external changes | `Off` |
| Track only root files | `On` (if available) |
| Trigger watcher regardless of syntax errors | `On` |
| Create output file from stdout | `Off` |
| Output paths to refresh | `Leaflet.Polydraw/README.md` |
| Show console | `On error` |

### Safe verification

1. Edit `README.md` at the repo root and save.
2. Confirm watcher runs once and updates `Leaflet.Polydraw/README.md`.
3. Save `Leaflet.Polydraw/README.md` directly.
4. Confirm watcher does not run.
