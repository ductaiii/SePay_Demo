# Use official Node image bản node 22
FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
COPY tsconfig.json ./
RUN npm install --production=false

# Copy source
COPY . .

# Build step is not strictly necessary because project uses ts-node in start script
# but we keep typescript available for dev. Expose port
EXPOSE 3000

CMD ["npm", "start"]
