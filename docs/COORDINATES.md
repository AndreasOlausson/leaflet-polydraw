# Coordinate Auto-Detection

Automatically detects and converts multiple coordinate formats when adding predefined polygons.
The `addPredefinedPolygon()` method intelligently interprets both **object**, **array**, and **string** inputs — no manual parsing required.

**Supported Formats:**

```javascript
// Object formats
{ lat: 59.903, lng: 10.724 }
{ latitude: 59.903, longitude: 10.724 }
{ longitude: 10.724, latitude: 59.903 }

// Array formats (with smart detection)
[59.903, 10.724]  // lat, lng
[10.724, 59.903]  // lng, lat (detected by longitude range)

// String formats
"59.903,10.724"                    // Comma-separated
"59°54'10.8\"N 10°43'26.4\"E"     // DMS (Degrees Minutes Seconds)
"59°54.18'N 10°43.44'E"           // DDM (Degrees Decimal Minutes)
"59.903°N, 10.724°E"              // Decimal Degrees with Direction
"N59 E10"                         // N/E shorthand format (e.g., N59 E10)
```

**Usage Example:**

```javascript
// All these formats work automatically
polydraw.addPredefinedPolygon([
  [
    [
      { lat: 59.903, lng: 10.724 }, // Object format
      [59.908, 10.728], // Array format
      "59.91,10.72", // String format
      "59°54'N 10°43'E", // DMS format
      { latitude: 59.903, longitude: 10.724 }, // Alternative object format
    ],
  ],
]);
```

**Smart Detection Features:**

- **Longitude Range Detection**: Automatically distinguishes `[lng, lat]` vs `[lat, lng]` based on coordinate ranges
- **GeoJSON Default**: If a numeric pair is ambiguous (both values could represent valid latitudes, e.g. 59, 10), Polydraw assumes GeoJSON order (`[lng, lat]`)
- **Error Handling**: Provides helpful error messages for unsupported formats (UTM, MGRS, Plus Codes)
- **Format Priority**: DMS/DDM formats take precedence over comma-separated strings
