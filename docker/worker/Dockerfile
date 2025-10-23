# Worker (BullMQ) - Dev image
# Shares the same codebase as API under apps/api

FROM node:20-alpine

WORKDIR /app
ENV CI=true
ENV NODE_ENV=development

RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm install --include=dev || true

COPY . .

CMD ["npm", "run", "worker"]

