# Base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source code
COPY . .

# Generate Prisma client for Linux
RUN npx prisma generate

# Expose backend port
EXPOSE 4000

# Start the server
CMD ["npm", "start"]
