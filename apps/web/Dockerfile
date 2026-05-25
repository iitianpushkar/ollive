FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/
RUN npm install --workspace=@ollive/web --include-workspace-root
COPY apps/web/ apps/web/
RUN mkdir -p apps/web/public
ARG NEXT_PUBLIC_CHATBOT_URL=http://localhost:8000
ARG NEXT_PUBLIC_INGESTION_URL=http://localhost:8001
ENV NEXT_PUBLIC_CHATBOT_URL=$NEXT_PUBLIC_CHATBOT_URL
ENV NEXT_PUBLIC_INGESTION_URL=$NEXT_PUBLIC_INGESTION_URL
RUN npm run build -w @ollive/web

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
