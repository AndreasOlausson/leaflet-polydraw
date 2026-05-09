# Custom Polygon Menu Actions

Polydraw can add your own buttons to the polygon menu through
`polygonTools.menuActions`. These actions are useful when your application needs
domain-specific geometry operations without forking or modifying Polydraw itself.

Custom actions are shown next to the built-in polygon tools, but they remain
application-owned: you provide the button id, label, optional CSS class, and the
function that returns the replacement polygon.

## Basic Example

```typescript
import Polydraw, {
  type PolygonMenuAction,
  type PolygonMenuActionContext,
} from "leaflet-polydraw";
import type { Feature, Polygon } from "geojson";

const makeTriangle: PolygonMenuAction = {
  id: "makeTriangle",
  label: "Injected custom",
  className: ["menu-action-custom", "make-triangle"],
  apply: ({ bounds }: PolygonMenuActionContext): Feature<Polygon> => {
    const nw = bounds.getNorthWest();
    const ne = bounds.getNorthEast();
    const south = bounds.getSouth();
    const centerLng = (bounds.getWest() + bounds.getEast()) / 2;

    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [nw.lng, nw.lat],
            [ne.lng, ne.lat],
            [centerLng, south],
            [nw.lng, nw.lat],
          ],
        ],
      },
    };
  },
};

const polydraw = new Polydraw({
  config: {
    polygonTools: {
      menuActions: [makeTriangle],
    },
  },
});
```

## Action Contract

```typescript
type PolygonMenuAction = {
  id: string;
  label: string;
  apply: (ctx: PolygonMenuActionContext) =>
    | PolygonMenuActionResult
    | Promise<PolygonMenuActionResult>;
  className?: string | string[];
  visible?: (ctx: PolygonMenuActionContext) => boolean;
  history?: boolean;
};
```

### `id`

Unique id for the action. It is emitted as `menuActionId` internally and is also
used as the button's `data-action-id`.

Do not reuse built-in ids:

- `simplify`
- `doubleElbows`
- `bbox`
- `bezier`
- `scale`
- `rotate`
- `donut`
- `toggleOptimization`

If an action collides with a built-in id, Polydraw ignores the custom action.

Built-in polygon menu action ids:

| Id | Menu action |
| --- | --- |
| `simplify` | Simplify polygon |
| `doubleElbows` | Double elbows / add intermediate vertices |
| `bbox` | Convert to bounding box |
| `bezier` | Apply Bezier smoothing |
| `scale` | Open scale transform handles |
| `rotate` | Open rotate transform handles |
| `donut` | Open donut transform handles |
| `toggleOptimization` | Toggle visual optimization markers |

Custom actions share the `polygonMenuAction` history bucket internally, but each
custom button still uses its own `id` from `polygonTools.menuActions`.

### `label`

Used for the button title and `aria-label`. Keep it short because menu buttons
are icon-first controls.

### `className`

Optional CSS class or class list for the menu button.

If omitted, Polydraw uses `menu-action-default`, which renders the generic
custom-action icon. For app-specific actions, pass your own class and style it
from your application stylesheet.

```typescript
const exportAction: PolygonMenuAction = {
  id: "exportSelection",
  label: "Export",
  className: ["menu-action-custom", "export-selection"],
  apply: ({ polygon }) => polygon,
};
```

```css
.marker-menu-content .marker-menu-button.export-selection {
  background-image: url("/icons/export-selection.svg");
}
```

### `visible`

Optional predicate called before the polygon menu is rendered. Return `false` to
hide the action for the current polygon.

```typescript
const onlyForLargePolygons: PolygonMenuAction = {
  id: "largeOnly",
  label: "Large only",
  visible: ({ bounds }) => bounds.getNorthEast().distanceTo(bounds.getSouthWest()) > 500,
  apply: ({ polygon }) => polygon,
};
```

If `visible` throws, Polydraw hides the action for that menu render.

### `history`

Defaults to `true`. Set `history: false` for actions that should not create an
undo step.

```typescript
const previewAction: PolygonMenuAction = {
  id: "previewOnly",
  label: "Preview",
  history: false,
  apply: ({ polygon }) => polygon,
};
```

## Callback Context

Every action receives a `PolygonMenuActionContext`.

```typescript
type PolygonMenuActionContext = {
  polygon: Feature<Polygon | MultiPolygon>;
  featureGroup: L.FeatureGroup;
  bounds: L.LatLngBounds;
};
```

### `polygon`

The complete current polygon as GeoJSON, including holes and MultiPolygon
geometry where applicable. Coordinates are GeoJSON coordinates: `[lng, lat]`.

### `featureGroup`

The Leaflet feature group backing the polygon. Use this for reading existing
Leaflet state if necessary. Avoid mutating it directly from your action; return a
polygon result instead so Polydraw can preserve metadata, layers, styling, and
history correctly.

### `bounds`

The current polygon bounds. This is convenient for operations that generate a
new geometry from the polygon's extent.

## Return Values

An action can return a GeoJSON polygon directly:

```typescript
const noOp: PolygonMenuAction = {
  id: "noOp",
  label: "No op",
  apply: ({ polygon }) => polygon,
};
```

Or it can return an object with operation options:

```typescript
const replaceWithoutMerge: PolygonMenuAction = {
  id: "replaceWithoutMerge",
  label: "Replace",
  apply: ({ polygon }) => ({
    polygon,
    allowMerge: false,
    simplify: false,
  }),
};
```

Supported result fields:

| Field | Type | Behavior |
| --- | --- | --- |
| `polygon` | `Feature<Polygon | MultiPolygon>` | Replacement geometry. |
| `allowMerge` | `boolean` | Set `false` to prevent the result from merging with nearby polygons. Default is normal merge behavior. |
| `simplify` | `boolean` | Set `true` to run simplification when Polydraw adds the result. Default is `false` for menu action results. |

Return `null` or `undefined` to leave the polygon unchanged.

## Async Actions

`apply` may return a promise. This lets you call application services or run
larger geometry processing asynchronously.

```typescript
const serverProcessed: PolygonMenuAction = {
  id: "serverProcessed",
  label: "Process",
  async apply({ polygon }) {
    const response = await fetch("/api/polygon/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(polygon),
    });

    return (await response.json()) as Feature<Polygon>;
  },
};
```

If the promise rejects, Polydraw skips the operation and keeps the original
polygon.

## Styling Custom Actions

Polydraw marks custom menu actions with your `className`. The built-in stylesheet
also provides two helper classes:

- `menu-action-default`: default custom-action icon and custom-action styling.
- `menu-action-custom`: custom-action styling without forcing the default icon.

Use `menu-action-custom` when you want Polydraw's custom-action visual treatment
but your own icon.

```typescript
const action: PolygonMenuAction = {
  id: "makeTriangle",
  label: "Injected custom",
  className: ["menu-action-custom", "make-triangle"],
  apply: createTriangle,
};
```

```css
.marker-menu-content .marker-menu-button.make-triangle {
  background-image: url("/icons/triangle.svg");
}
```

## Runtime Rules

- Custom actions only render for editable polygons.
- Actions are rechecked when the menu is clicked, so stale buttons do not execute
  after a layer becomes readonly.
- Built-in action ids are reserved.
- Returned geometries must be GeoJSON `Polygon` or `MultiPolygon` features.
- Metadata, layer assignment, style overrides, and visual optimization metadata
  are preserved when Polydraw replaces the polygon.
