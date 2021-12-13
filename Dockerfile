FROM node:17-alpine
LABEL version=1.0.0
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
ADD src ./src
RUN npm run build
CMD ["node", "dist/main.js"]
