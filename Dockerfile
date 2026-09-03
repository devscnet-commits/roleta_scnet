# --- Stage 1: build the frontend ---
FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: backend + built frontend ---
FROM node:22-slim
WORKDIR /app/backend
ENV NODE_ENV=production
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist /app/frontend-dist

ENV FRONTEND_DIST_DIR=/app/frontend-dist
ENV PORT=4000
ENV DB_PATH=/app/data/data.sqlite
ENV UPLOADS_DIR=/app/data/uploads

EXPOSE 4000
CMD ["sh", "-c", "node src/seed.js && node src/server.js"]
