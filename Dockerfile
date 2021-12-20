FROM node:14-alpine as Builder

WORKDIR /action

COPY package.json package-lock.json tsconfig.json ./

RUN npm ci

ADD src ./src

RUN npm run pack

FROM node:14-alpine

COPY --from=Builder /action/build /action

CMD ["node", "/action/index.js"]
