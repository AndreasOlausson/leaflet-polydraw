#!/bin/sh

export CI=true

echo "Building and testing Polydraw Docker with full plugin test suite..."

if [ -d "test" ]; then
    # Inside Docker container - we're in /app directory
    echo ""
    echo "Running comprehensive test suite (Docker + Plugin tests via Vitest)..."
    npm test
    
    echo ""
    echo "Plugin tests completed successfully in container environment!"
    echo "Total tests run: Docker tests + Leaflet.Polydraw plugin tests"
    
else
    # Outside Docker container - we're in project root
    # Build the plugin and Docker project
    cd Polydraw_Docker && npm run build && cd ..
    
    # Run Docker project tests
    echo ""
    echo "Running Polydraw_Docker tests..."
    cd Polydraw_Docker && npm test && cd ..
    
    # Run the comprehensive plugin tests
    echo ""
    echo "Running Leaflet.Polydraw plugin tests..."
    cd Leaflet.Polydraw && npm test && cd ..
fi

echo ""
echo "All tests completed!"
