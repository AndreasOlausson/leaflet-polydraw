# #!/bin/sh

# export CI=true

# echo "Building and testing Polydraw Docker with full plugin test suite..."

# # Build the plugin and Docker project
# npm run build

# # Run Docker project tests
# echo ""
# echo "Running Polydraw_Docker tests..."
# npm test ${@}

# # Run the comprehensive plugin tests
# echo ""
# echo "Running Leaflet.Polydraw plugin tests..."
# cd ../Leaflet.Polydraw && npm test

# echo ""
# echo "All tests completed!"
#!/bin/sh
set -e

export CI=true

echo "Building and testing Polydraw Docker with full plugin test suite..."

# Build the plugin and Docker project
npm run build

# Run Docker project tests
echo ""
echo "Running Polydraw_Docker tests..."
npm test "$@"

# Run the comprehensive plugin tests
echo ""
echo "Running Leaflet.Polydraw plugin tests..."
cd ../Leaflet.Polydraw
npm test
cd ..

echo ""
echo "All tests completed!"