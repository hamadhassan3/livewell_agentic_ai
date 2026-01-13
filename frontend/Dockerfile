# Use the official Node.js runtime as base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies with legacy peer deps flag
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Expose the port that Expo uses
EXPOSE 8081

# Start the Expo development server
CMD ["npm", "start"]
