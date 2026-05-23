# Polydraw Public Demo

This workspace contains the standalone public demo site for `leaflet-polydraw`.

It is intentionally separate from `Leaflet.Polydraw/` so the public demo consumes the package the same way users do: from npm.

## Structure

- `apps/wrapper` - landing page and compatibility hub
- `apps/leaflet-v1` - public demo targeting Leaflet 1.9.x
- `apps/leaflet-v2` - public demo targeting Leaflet 2.x
- `packages/shared-content` - scenario content, fixtures, copy, and route metadata
- `packages/shared-ui` - shared shell rendering and design tokens

## Local Development

Install once from this directory:

```bash
npm install
```

Run apps individually:

```bash
npm run dev:wrapper
npm run dev:v1
npm run dev:v2
```

Run the Leaflet apps against the local workspace source instead of the published npm package:

```bash
npm run dev:wrapper:local
npm run dev:v1:local
npm run dev:v2:local
```

The default mode is the public npm package. The `:local` scripts map to a Vite `workspace` mode under the hood, so `npm run dev:local --workspace @polydraw-demo/leaflet-v1` and similar commands work too.

Default local ports:

- wrapper: `http://localhost:4173`
- Leaflet v1 demo: `http://localhost:4174`
- Leaflet v2 demo: `http://localhost:4175`

## Production Build

```bash
npm run build
```

To stage a local-source build instead of the npm package build:

```bash
npm run build:local
```

This stages a deployable `dist/` tree with these route targets:

- `/`
- `/leaflet-v1/`
- `/leaflet-v2/`

## Notes

- The inline demo inside `Leaflet.Polydraw/demo` remains the developer/test harness.
- This workspace is the public-facing hosted demo.
- This workspace intentionally consumes the published `leaflet-polydraw` package from npm so the hosted demo reflects the public install path.
- For branch-local verification before release, use the `:local` scripts so the Leaflet apps alias `leaflet-polydraw` to the local `Leaflet.Polydraw/src` workspace while still resolving each app's own Leaflet runtime.
- The v1 and v2 apps intentionally run as separate bundles; they do not try to share a Leaflet runtime.
