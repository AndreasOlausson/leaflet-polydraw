FROM node:22.14.0-alpine3.21@sha256:9bef0ef1e268f60627da9ba7d7605e8831d5b56ad07487d24d1aa386336d1944
WORKDIR /app

# Copy package files and install dependencies (without the plugin dependency)
COPY package.json package-lock.json ./
RUN npm install --ignore-scripts || npm install leaflet @turf/turf concaveman @types/leaflet typescript vite vitest jsdom

# Copy the rest of the application
COPY . .

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
COPY run_tests_root.sh ./run_tests.sh
RUN chmod +x ./run_tests.sh

CMD ["sh"]
