FROM node:14.18.0

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json .

RUN npm install
RUN npm install argon2 --build-from-source

COPY . .
COPY .env .
COPY .env.production .

# Bundle app source
RUN npm run build 
# ENV NODE_ENV production
ENV NODE_ENV development
ENV DATABASE_URL postgresql://postgres:postgres@localhost:5432/lireddit2
ENV PORT 4000
ENV CORS_ORIGIN http://localhost:3000
ENV DB_CONNECTION_RETRIES 10
ENV DB_CONNECTION_RETRY_DELAY 5000
ENV SESSION_SECRET 3lMGIPkuu5#8O9ga$ywxI0zEVv3@6c**Gh5^9Nm5pcVHj0wyE4j#QChmEpLS

EXPOSE 4000
CMD [ "node", "dist/index.js" ]

USER node