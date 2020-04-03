FROM node:13-alpine
LABEL version=1.1.0
ADD ./app /app
WORKDIR /app
RUN cd /app && npm i
CMD ["node", "/app/main.js"]