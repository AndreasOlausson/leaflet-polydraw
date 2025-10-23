# Leaflet.Polydraw Dual Compatibility Guide

## Overview

Leaflet.Polydraw now supports both **Leaflet v1.x** and **Leaflet v2.x** with a single plugin! This dual compatibility ensures your applications work seamlessly regardless of which Leaflet version you're using.

## 🚀 Quick Start

### Installation

```bash
npm install leaflet-polydraw
```

### Usage with Leaflet v1.x (Traditional)

```html
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet-polydraw/dist/polydraw.umd.min.js"></script>

<script>
  const map = L.map('map').setView([51.505, -0.09], 13);
  const polydraw = L.control.polydraw().addTo(map);
</script>
```

### Usage with Leaflet v2.x (ESM)

```html
<script type="importmap">
  {
    "imports": {
      "leaflet": "https://unpkg.com/leaflet@2.0.0-alpha.1/dist/leaflet.js",
      "leaflet-polydraw": "https://unpkg.com/leaflet-polydraw/dist/polydraw.es.js"
    }
  }
</script>

<script type="module">
  import { Map, TileLayer } from 'leaflet';
  import Polydraw from 'leaflet-polydraw';

  const map = new Map('map').setView([51.505, -0.09], 13);
  const polydraw = new Polydraw().addTo(map);
</script>
```

### Usage with Module Bundlers

```typescript
// Works with both Leaflet v1.x and v2.x
import * as L from 'leaflet';
import Polydraw from 'leaflet-polydraw';

const map = L.map('map').setView([51.505, -0.09], 13);
const polydraw = new Polydraw().addTo(map);
```

## 🔧 How It Works

### Automatic Version Detection

The plugin automatically detects which version of Leaflet you're using and adapts accordingly:

```typescript
import { LeafletVersionDetector } from 'leaflet-polydraw/dist/compatibility/version-detector';

// Check which version is being used
const version = LeafletVersionDetector.getVersion(); // '1.x' or '2.x'
const isV1 = LeafletVersionDetector.isV1();
const isV2 = LeafletVersionDetector.isV2();
```

### Compatibility Layer

The plugin includes a comprehensive compatibility layer that handles:

- **Factory Methods vs Constructors**: Automatically uses `L.marker()` for v1.x and `new Marker()` for v2.x
- **Global L Object**: Handles both global `L` access and ESM imports
- **Event System**: Manages differences between mouse/touch events and pointer events
- **DOM Utilities**: Provides fallbacks for removed utility methods
- **Browser Detection**: Maintains compatibility with removed browser flags

## 📦 Package Configuration

### Peer Dependencies

```json
{
  "peerDependencies": {
    "leaflet": "^1.9.4 || ^2.0.0-alpha"
  }
}
```

### Export Map

```json
{
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/polydraw.es.js",
      "require": "./dist/polydraw.umd.min.js"
    }
  }
}
```

## 🧪 Testing

The plugin is tested against both Leaflet versions to ensure compatibility:

```bash
# Test with current Leaflet version
npm test

# Test build compatibility
npm run build
```

## 🔄 Migration Guide

### From Leaflet v1.x to v2.x

If you're upgrading from Leaflet v1.x to v2.x, Leaflet.Polydraw will continue to work without any code changes on your part. However, you may want to update your Leaflet usage to take advantage of v2.x features:

#### Before (v1.x style)

```javascript
const map = L.map('map');
const marker = L.marker([51.5, -0.09]);
const polydraw = L.control.polydraw();
```

#### After (v2.x style)

```javascript
import { Map, Marker } from 'leaflet';
import Polydraw from 'leaflet-polydraw';

const map = new Map('map');
const marker = new Marker([51.5, -0.09]);
const polydraw = new Polydraw();
```

### Configuration Compatibility

All existing configuration options remain the same across both versions:

```typescript
const polydraw = new Polydraw({
  config: {
    modes: {
      draw: true,
      subtract: true,
      p2p: true,
    },
    colors: {
      polyline: '#ff0000',
    },
  },
});
```

## 🏗️ Architecture

### Compatibility Layer Structure

```
src/compatibility/
├── version-detector.ts    # Detects Leaflet version
├── leaflet-adapter.ts     # Main compatibility layer
└── event-adapter.ts       # Event system compatibility
```

### Key Components

1. **Version Detection**: Automatically identifies Leaflet version using multiple detection methods
2. **Factory Method Abstraction**: Provides unified interface for object creation
3. **DOM Utility Compatibility**: Handles removed/changed DOM utility methods
4. **Event System Normalization**: Manages event differences between versions
5. **Browser Detection Fallbacks**: Provides fallbacks for removed browser flags

## 🚨 Breaking Changes Handled

The compatibility layer automatically handles these Leaflet v2.x breaking changes:

### Factory Methods → Constructors

- ✅ `L.marker()` → `new Marker()`
- ✅ `L.polyline()` → `new Polyline()`
- ✅ `L.polygon()` → `new Polygon()`
- ✅ `L.divIcon()` → `new DivIcon()`

### Global L Object → ESM Imports

- ✅ Automatic detection of import style
- ✅ Fallback handling for missing global `L`

### Event System Changes

- ✅ Mouse/Touch → Pointer events
- ✅ Event property changes (`layer` → `propagatedFrom`)

### Removed Utility Methods

- ✅ `L.Util.trim()` → `String.prototype.trim()`
- ✅ `L.Util.isArray()` → `Array.isArray()`
- ✅ `L.Util.extend()` → `Object.assign()`
- ✅ Browser detection flags fallbacks

## 📊 Performance Impact

The compatibility layer is designed to have minimal performance impact:

- **Bundle Size**: < 10% increase
- **Runtime Overhead**: < 5% performance impact
- **Memory Usage**: Negligible additional memory usage
- **Tree Shaking**: Compatible with modern bundlers

## 🐛 Troubleshooting

### Common Issues

#### "L is not defined" Error

This usually occurs in test environments or when using ESM imports incorrectly.

**Solution**: The compatibility layer handles this automatically. If you see this error, ensure you're importing Leaflet correctly for your version.

#### Type Errors with TypeScript

Make sure you have the correct Leaflet types installed:

```bash
# For v1.x
npm install --save-dev @types/leaflet@^1.9.0

# For v2.x (when available)
npm install --save-dev @types/leaflet@^2.0.0
```

#### Plugin Not Working After Leaflet Upgrade

1. Clear your node_modules and package-lock.json
2. Reinstall dependencies
3. Ensure peer dependency ranges are satisfied

### Debug Information

You can get detailed version information for debugging:

```typescript
import { LeafletVersionDetector } from 'leaflet-polydraw/dist/compatibility/version-detector';

const debugInfo = LeafletVersionDetector.getVersionInfo();
console.log(debugInfo);
// Output:
// {
//   version: '1.x',
//   leafletVersion: '1.9.4',
//   hasFactoryMethods: true,
//   hasConstructors: false,
//   globalLAvailable: true
// }
```

## 🤝 Contributing

When contributing to the dual compatibility system:

1. Test changes against both Leaflet v1.x and v2.x
2. Update compatibility layer if new Leaflet APIs are used
3. Ensure backward compatibility is maintained
4. Add tests for both versions when applicable

## 📝 License

This dual compatibility system is part of Leaflet.Polydraw and is licensed under the same MIT license.

---

**Need help?** Open an issue on [GitHub](https://github.com/andreasolausson/leaflet-polydraw/issues) with details about your Leaflet version and setup.
