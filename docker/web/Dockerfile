# Web (Next.js App Router) - Dev image
# Expects a Next.js project in apps/web with package.json

FROM node:20-alpine

WORKDIR /app
ENV CI=true
ENV NODE_ENV=development
ENV PORT=3000

RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm install --include=dev || true

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]

