FROM node:7

COPY docker/raybans/test.sh /test.sh
RUN chmod 0777 /test.sh

COPY docker/raybans/deploy.sh /deploy.sh
RUN chmod 0777 /deploy.sh

WORKDIR /raybans
COPY app/ /raybans/app/

WORKDIR /raybans/app
# --silent necessary to ensure that travis logs
# do not get overwhelmed on UI
RUN npm install --silent
