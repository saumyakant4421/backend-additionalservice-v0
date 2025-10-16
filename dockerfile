FROM node:20-slim AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
FROM node:20-slim
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY . .
EXPOSE $PORT
ENV NODE_ENV=production
CMD ["npm", "start"]