FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY services ./services
COPY apps ./apps

RUN npm ci
RUN npm run build -w @ollive/db
RUN npm run build -w @ollive/sdk
RUN npm run build -w @ollive/chatbot

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY packages ./packages
COPY services ./services

RUN npm ci --omit=dev

COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/ollive-sdk/dist ./packages/ollive-sdk/dist
COPY --from=builder /app/services/chatbot/dist ./services/chatbot/dist

EXPOSE 8000
CMD ["npm", "run", "start", "-w", "@ollive/chatbot"]
