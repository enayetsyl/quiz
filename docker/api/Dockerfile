# API (Express/TypeScript) - Dev image
# Expects a Node.js project in apps/api with package.json

FROM node:20-alpine

WORKDIR /app
ENV CI=true
ENV NODE_ENV=development

# Useful native deps for some packages
RUN apk add --no-cache libc6-compat

# Install deps first (leverages Docker cache once you add package.json)
COPY package*.json ./
RUN npm install --include=dev || true

# Copy the rest (source will be bind-mounted in docker-compose for dev)
COPY . .

EXPOSE 4000
CMD ["npm", "run", "dev"]

