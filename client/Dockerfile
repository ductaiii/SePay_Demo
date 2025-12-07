FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5173

# Start Vite dev server and bind to 0.0.0.0 so it's accessible from host/docker network
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
