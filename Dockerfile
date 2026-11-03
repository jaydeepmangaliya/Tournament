# ==============================================================================
# STAGE 1: Build Frontend (Vite + React 19 + Tailwind CSS)
# ==============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /workspace/FE

# Install frontend dependencies
COPY FE/package*.json ./
RUN npm install

# Copy frontend source and build to ../BE/build
COPY FE/ ./
RUN npm run build

# ==============================================================================
# STAGE 2: Production Node.js Server Runner
# ==============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

# Install build dependencies required for native packages (bcrypt)
RUN apk add --no-cache python3 make g++

# Install production dependencies only
COPY BE/package*.json ./
RUN npm install --omit=dev

# Remove build tools to keep production image lightweight
RUN apk del python3 make g++

# Copy backend application source
COPY BE/ ./

# Copy compiled frontend from Stage 1 into backend static build directory
COPY --from=frontend-builder /workspace/BE/build ./build

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=2000
EXPOSE 2000

# Start production server
CMD ["node", "index.js"]
