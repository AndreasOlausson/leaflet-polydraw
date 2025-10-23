# Demo

A local demo is included in the `demo/` directory for testing and development purposes.

## Running the Demo

To run the local demo and test the plugin with different Leaflet versions:

1. **Build the main library and type definitions**

   ```bash
   cd Leaflet.Polydraw
   npm run build
   npm run build:types
   ```

2. **Select which Leaflet version to test**

   You can switch between **Leaflet v1.9.x** and **Leaflet v2.x (alpha)** using the helper script:

   ```bash
   # From the project root
   ./switch-version.sh v1    # For Leaflet 1.9.4
   ./switch-version.sh v2    # For Leaflet 2.0.0-alpha.1 (default)
   ```

   This automatically installs the correct Leaflet version inside the demo project.

3. **Run the demo**

   ```bash
   cd Leaflet.Polydraw/demo
   npm run dev
   ```

   The demo will start at [http://localhost:5173](http://localhost:5173)
   and includes examples of all major features — freehand drawing, polygon merging, editing, and more.
