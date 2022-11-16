FROM node:14.18.0

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .
COPY .env .
COPY .env.production .

RUN npm run build 
ENV NODE_ENV production
ENV DATABASE_URL postgresql://postgres:postgres@localhost:5432/lireddit2
ENV PORT 4000
ENV CORS_ORIGIN http://localhost:3000

EXPOSE 8080
CMD [ "node", "dist/index.js" ]

USER node