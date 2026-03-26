FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend files
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

COPY backend/ ./backend/
RUN cd backend && npm run build

# ─── Production image ───────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install production deps only
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy compiled backend
COPY --from=builder /app/backend/dist ./backend/dist

# Copy frontend (served as static files)
COPY frontend/ ./frontend/

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]
