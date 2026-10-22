FROM node:20-alpine
RUN apk add --no-cache postgresql-client
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force
COPY server/ ./server/
EXPOSE 4000
CMD ["node", "server/src/index.js"]
