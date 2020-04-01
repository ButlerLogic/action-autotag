FROM node:13-alpine
ADD ./app /app
WORKDIR /app
RUN npm i
ENTRYPOINT ["node", "/app/main.js"]