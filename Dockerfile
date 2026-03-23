FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
COPY .env.production .env.production
RUN npm run build
EXPOSE 5001
CMD ["node", "server/index.js"]
