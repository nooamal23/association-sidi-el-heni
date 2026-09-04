FROM node:20-alpine AS build
WORKDIR /app

# Install
COPY package.json bun.lock* ./
RUN corepack enable && npm install -g bun && bun install --frozen-lockfile

# Build
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

# ---- Runtime: serve static SSR + Node server ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app /app
EXPOSE 3000

# Drop root for the runtime process.
RUN chown -R node:node /app
USER node

CMD ["node", ".output/server/index.mjs"]
