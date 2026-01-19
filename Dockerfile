
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build step might fail if ENV vars are missing, strict mode? 
# For dev/test simply running dev server might be easier, 
# but "docker-compose" implies a more persistent runnable state.
# Let's try production build first.
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
