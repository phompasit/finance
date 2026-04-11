# ===== STAGE 1: Build Frontend =====
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package.json (frontend)
COPY package*.json ./
RUN npm ci --frozen-lockfile

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# ===== STAGE 2: Production =====
FROM node:20-alpine AS production
WORKDIR /app

# ✅ ติดตั้ง server dependencies แยก
COPY server/package*.json ./server/
RUN cd server && npm ci --frozen-lockfile --omit=dev

# Copy server code
COPY server/ ./server/

# Copy frontend build จาก stage 1
COPY --from=builder /app/dist ./public

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:5001/api/health || exit 1

CMD ["node", "server/index.js"]