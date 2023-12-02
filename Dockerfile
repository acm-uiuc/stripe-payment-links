FROM node:lts
WORKDIR /usr/src/app
RUN apt-get update && apt-get install gnupg2 build-essential make gcc libc6 -y && apt-get clean
COPY package*.json ./
RUN yarn
COPY . .
CMD [ "yarn", "run", "container-start" ]    