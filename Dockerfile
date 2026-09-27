FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run generate && npm run build
EXPOSE 4000
CMD ["sh", "-c", "npm run migrate && npm run seed && npm start"]
