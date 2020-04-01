FROM node:13-alpine
ADD ./app /app
WORKDIR /app
RUN cd /app && npm i
CMD ["node", "/app/main.js"]