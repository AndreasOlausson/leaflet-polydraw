# Installation

```bash
npm install leaflet-polydraw
```

## CDN Usage

You can also use Leaflet.Polydraw directly in the browser via a CDN like [jsDelivr](https://www.jsdelivr.com/) or [unpkg](https://unpkg.com/):

### Include via CDN

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/leaflet@latest/dist/leaflet.css"
/>
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/leaflet-polydraw@latest/dist/leaflet-polydraw.css"
/>
<script src="https://cdn.jsdelivr.net/npm/leaflet@latest/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/leaflet-polydraw@latest/dist/polydraw.umd.min.js"></script>
```

### Example Usage

```html
<script>
  const map = L.map("map").setView([58.4, 15.6], 10);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  const polydraw = new LeafletPolydraw();
  map.addControl(polydraw);
</script>
```

> Note: All icons and styles are included automatically when using the CSS from the CDN.
