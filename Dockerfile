FROM docker.io/node:8.7.0-alpine

RUN apk update \
&& apk add libc6-compat \
&& apk add ca-certificates \
&& apk add openssl

RUN npm config set unsafe-perm true \
&& npm install -g typescript@2.5.2 \
&& npm install -g gulp@3.9.1 \
&& npm list -g

WORKDIR /tmp

RUN mkdir -p /data1/www/app
WORKDIR /data1/www/app
COPY . /data1/www/app
RUN npm install && tsc
ENV NODE_ENV production
ENV DEBUG SPM:*
EXPOSE 9090
CMD [ "node", "index.js" ]
