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

WORKDIR /app

# Copy built application
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ../packages/shared/dist

# Set production environment
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "dist/index.js"]