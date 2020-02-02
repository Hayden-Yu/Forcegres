FROM node:12
RUN mkdir /forcegres
WORKDIR /forcegres
COPY . /forcegres/
RUN npm ci --only=production
RUN npm run build
CMD npm run init; npm run exec
