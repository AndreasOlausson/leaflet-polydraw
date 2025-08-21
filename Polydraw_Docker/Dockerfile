FROM node:22.14.0-alpine3.21@sha256:9bef0ef1e268f60627da9ba7d7605e8831d5b56ad07487d24d1aa386336d1944
WORKDIR /app

# Copy the Leaflet.Polydraw plugin source first
COPY Leaflet.Polydraw ./Leaflet.Polydraw

# Build the plugin from source inside container
WORKDIR /app/Leaflet.Polydraw
RUN npm install && npm run build

# Switch to main app directory
WORKDIR /app

# Copy package files and install dependencies
COPY Polydraw_Docker/package.json ./
RUN npm install

# Copy the rest of the application
COPY Polydraw_Docker .

# Copy the root run_tests.sh script for validator
COPY run_tests.sh ./run_tests.sh
RUN chmod +x ./run_tests.sh

CMD ["sh"]
