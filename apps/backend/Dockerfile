# Build stage
FROM node:18-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.1 --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY turbo.json ./

# Copy packages
COPY packages ./packages
COPY apps/backend ./apps/backend

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared packages and backend
RUN pnpm turbo run build --filter=@muta/backend...

# Production stage
FROM node:18-alpine

# Install pnpm for production
RUN corepack enable && corepack prepare pnpm@8.15.1 --activate

WORKDIR /app

# Copy workspace configuration
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./

# Copy built application and its package.json
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

# Install only production dependencies (skip prepare scripts)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

WORKDIR /app/apps/backend

# Set production environment
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "dist/index.js"]