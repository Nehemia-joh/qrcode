FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
RUN npm ci --workspace=apps/api --omit=dev 2>/dev/null || npm install --workspace=apps/api --omit=dev
COPY apps/api ./apps/api
COPY scripts ./scripts
RUN mkdir -p /app/data
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "apps/api/src/index.js"]
