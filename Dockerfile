FROM node:13-alpine
ADD ./app /app
WORKDIR /app
RUN npm i
CMD ["node", "main.js"]