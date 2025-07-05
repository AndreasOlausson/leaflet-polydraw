FROM node:22.14.0-alpine3.21@sha256:9bef0ef1e268f60627da9ba7d7605e8831d5b56ad07487d24d1aa386336d1944
WORKDIR /app

# Copy the Leaflet.Polydraw plugin source first
COPY Leaflet.Polydraw ./Leaflet.Polydraw

# Copy turf-helper.ts to /app/src so test can find it
COPY Leaflet.Polydraw/src/turf-helper.ts ./src/turf-helper.ts

# Build the plugin from source inside container
WORKDIR /app/Leaflet.Polydraw
RUN npm install && \
    chmod +x node_modules/.bin/* && \
    echo ">>> Attempting to build Leaflet.Polydraw..." && \
    (npm run build 2>&1 || ( \
        echo "" && \
        echo "██████████████████████████████████████████████████████████████████████████████████" && \
        echo "██                                                                              ██" && \
        echo "██                          ⚠️  BUILD FAILED  ⚠️                                   ██" && \
        echo "██                                                                              ██" && \
        echo "██  Leaflet.Polydraw failed to build due to compilation errors.                 ██" && \
        echo "██  This may result in missing functionality in the container.                  ██" && \
        echo "██  Check the TypeScript error output above for details.                        ██" && \
        echo "██                                                                              ██" && \
        echo "██████████████████████████████████████████████████████████████████████████████████" && \
        echo "" && \
        echo "BUILD_FAILED" > /tmp/build_status && \
        echo "██████████████████████████████████████████████████████████████████████████████████" > /tmp/error_message && \
        echo "                                                                              " >> /tmp/error_message && \
        echo "                          ⚠️  BUILD FAILED  ⚠️                                   " >> /tmp/error_message && \
        echo "                                                                              " >> /tmp/error_message && \
        echo "  Leaflet.Polydraw failed to build due to compilation errors.                 " >> /tmp/error_message && \
        echo "  This is a result of a horrible response from one of the models.                 " >> /tmp/error_message && \
        echo "  This may (will) result in missing functionality in the container.                  " >> /tmp/error_message && \
        echo "  The container will still work but without the Polydraw plugin.              " >> /tmp/error_message && \
        echo "                                                                              " >> /tmp/error_message && \
        echo "██████████████████████████████████████████████████████████████████████████████████" >> /tmp/error_message && \
        sleep 8 && \
        exit 0 \
    )) && \
    echo "BUILD_SUCCESS" > /tmp/build_status && \
    echo ">>> Build succeeded! Continuing with container build..."

# Switch to main app directory
WORKDIR /app

# Copy package files and install dependencies (without the plugin dependency)
COPY Polydraw_Docker/package.json ./
RUN npm install --ignore-scripts || npm install leaflet @turf/turf concaveman @types/leaflet typescript vite vitest jsdom

# Copy the rest of the application
COPY Polydraw_Docker .

# Create a container-specific main.ts without the plugin
RUN echo "import 'leaflet/dist/leaflet.css';" > src/main.ts && \
    echo "import * as L from 'leaflet';" >> src/main.ts && \
    echo "" >> src/main.ts && \
    echo "const map = L.map('map').setView([58.402514, 15.606188], 13);" >> src/main.ts && \
    echo "" >> src/main.ts && \
    echo "L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {" >> src/main.ts && \
    echo "    attribution: '&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors'" >> src/main.ts && \
    echo "}).addTo(map);" >> src/main.ts && \
    echo "" >> src/main.ts && \
    echo "console.log('Map initialized for container testing');" >> src/main.ts

# Copy the root run_tests.sh script for validator
COPY run_tests.sh ./run_tests.sh
RUN chmod +x ./run_tests.sh

# Create a startup script that shows build status
RUN echo '#!/bin/sh' > /usr/local/bin/show_build_status.sh && \
    echo 'if [ -f /tmp/build_status ]; then' >> /usr/local/bin/show_build_status.sh && \
    echo '  if [ "$(cat /tmp/build_status)" = "BUILD_FAILED" ]; then' >> /usr/local/bin/show_build_status.sh && \
    echo '    echo ""' >> /usr/local/bin/show_build_status.sh && \
    echo '    cat /tmp/error_message' >> /usr/local/bin/show_build_status.sh && \
    echo '    echo ""' >> /usr/local/bin/show_build_status.sh && \
    echo '  fi' >> /usr/local/bin/show_build_status.sh && \
    echo 'fi' >> /usr/local/bin/show_build_status.sh && \
    chmod +x /usr/local/bin/show_build_status.sh

# Show final build status
RUN echo "" && \
    echo "████████████████████████████████████████████████████████████████████████████████████████" && \
    echo "██                                                                                    ██" && \
    echo "██                        🐳 CONTAINER BUILD COMPLETE 🐳                             ██" && \
    echo "██                                                                                    ██" && \
    echo "████████████████████████████████████████████████████████████████████████████████████████" && \
    if [ -f /tmp/build_status ]; then \
        if [ "$(cat /tmp/build_status)" = "BUILD_FAILED" ]; then \
            echo "" && \
            cat /tmp/error_message && \
            echo ""; \
        else \
            echo "██                                                                                    ██" && \
            echo "██                        ✅ Leaflet.Polydraw built successfully! ✅                ██" && \
            echo "██                                                                                    ██" && \
            echo "████████████████████████████████████████████████████████████████████████████████████████"; \
        fi; \
    fi && \
    echo ""

CMD ["/bin/sh", "-c", "if [ -f /tmp/error_message ]; then echo ''; cat /tmp/error_message; echo ''; fi && exec sh"]
