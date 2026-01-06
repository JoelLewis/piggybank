FROM node:20-alpine AS base

WORKDIR /app

# --- Build Frontend ---
FROM base AS build
WORKDIR /app/frontend
COPY frontend/package*.json ./
# Install all deps (including dev) for building
RUN npm ci
COPY frontend/ .
RUN npm run build

# --- Runtime ---
FROM base AS runtime
WORKDIR /app

# 1. Setup Backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --production
COPY backend/ .

# 2. Setup Frontend (SSR Runtime)
WORKDIR /app/frontend
COPY frontend/package*.json ./
# Install production dependencies for SSR server
RUN npm ci --production
# Copy built assets
COPY --from=build /app/frontend/dist ./dist

# 3. Copy backup script
COPY scripts/backup-database.sh /app/scripts/
RUN chmod +x /app/scripts/backup-database.sh

# 4. Finalize
WORKDIR /app
RUN mkdir -p data data/backups

# 5. Install and setup cron for automated backups
RUN apk add --no-cache dcron sqlite && \
    mkdir -p /var/log && \
    touch /var/log/cron.log

# Create crontab file - run backup daily at 2 AM
RUN echo "0 2 * * * /app/scripts/backup-database.sh >> /var/log/cron.log 2>&1" > /etc/crontabs/root

# Expose ports
EXPOSE 3000 4000

# Environment
ENV NODE_ENV=production
ENV DB_PATH=/app/data/piggybank.db
ENV INTERNAL_API_URL=http://localhost:4000/api

# Create start script
RUN echo "#!/bin/sh" > start.sh && \
    echo "echo 'Starting Cron for automated backups...'" >> start.sh && \
    echo "crond -b -l 2" >> start.sh && \
    echo "echo 'Starting Backend on port 4000...'" >> start.sh && \
    echo "PORT=4000 node backend/server.js &" >> start.sh && \
    echo "echo 'Starting Frontend on port 3000...'" >> start.sh && \
    echo "PORT=3000 node frontend/dist/server/entry.mjs" >> start.sh && \
    chmod +x start.sh

CMD ["./start.sh"]