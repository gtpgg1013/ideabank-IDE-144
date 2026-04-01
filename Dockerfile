FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY src ./src

ENV PORT=3344
ENV ACCESS_PASSWORD=ideabank2026

EXPOSE 3344

CMD ["node", "server.js"]
