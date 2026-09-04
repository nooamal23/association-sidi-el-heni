FROM node:20-alpine
WORKDIR /app

# OpenSSL is required by Prisma engines on Alpine.
RUN apk add --no-cache openssl

# Install deps (postinstall runs `prisma generate` — needs the schema).
COPY package.json ./
COPY prisma ./prisma
RUN npm install --omit=dev

# App source
COPY src ./src
COPY scripts ./scripts

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Drop root — the base image ships a "node" user (uid 1000) which owns /app
# after the COPY steps run above.
RUN chown -R node:node /app
USER node

CMD ["node", "src/index.js"]
