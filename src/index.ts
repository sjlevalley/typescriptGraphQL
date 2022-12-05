import "dotenv-safe/config";
import "reflect-metadata";
import { COOKIE_NAME, __prod__ } from "./constants";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import session from "express-session";
import Redis from "ioredis";
import connectRedis from "connect-redis";
import cors from "cors";
import { DataSource } from "typeorm";
import { Post } from "./entities/Post";
import { User } from "./entities/User";
import path from "path";
import { Vote } from "./entities/Vote";
import { createUserLoader } from "./utils/createUserLoader";
import { createVoteLoader } from "./utils/createVoteLoader";
// import { sendEmail } from "./utils/sendEmail";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export const typormConnection = new DataSource({
  type: "postgres",
  // url: `${process.env.DATABASE_URL}`,
  url: "postgresql://postgres:postgres@127.0.0.1:5432/reddit-ish",
  logging: true,
  // synchronize: true,
  entities: [Post, User, Vote],
  migrations: [path.join(__dirname, "./migrations/*")],
});

const main = async () => {
  // sendEmail("usmariner@proton.me", "Hello There");

  let retriesPostgres = 5;
  let retryDelay = 5000;
  if (process.env.DB_CONNECTION_RETRIES) {
    retriesPostgres = +process.env.DB_CONNECTION_RETRIES;
  }
  if (process.env.DB_CONNECTION_RETRY_DELAY) {
    retryDelay = +process.env.DB_CONNECTION_RETRY_DELAY;
  }
  while (retriesPostgres) {
    try {
      await typormConnection.initialize();
      console.log("Data Source has been initialized!");
      break;
    } catch (error) {
      console.error("Error during Data Source initialization", error);
      retriesPostgres -= 1;
      console.log(`${retriesPostgres} RETRIES REMAINING`);
      // wait 5 seconds before retrying
      await new Promise((res) => setTimeout(res, retryDelay));
    }
  }
  await typormConnection.runMigrations();

  // Uncomment this line and start app one time to delete all posts from db
  // await Post.delete({}); // delete posts from DB

  const app = express();
  // const redis = new Redis({ host: "redis" });
  const redis = new Redis();

  let RedisStore = connectRedis(session);

  const corsOptions = {
    origin: `${process.env.CORS_ORIGIN}`,
    // origin: "http://localhost:3000",
    credentials: true, // access-control-allow-credentials:true
  };

  app.set("proxy", 1);

  // Apply cors to all routes
  app.use(cors(corsOptions));

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
        port: 6379,
      }),
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
        httpOnly: true,
        sameSite: "lax",
        // secure: __prod__,
        secure: false,
        // domain: __prod__ ? ".codeponder.com" : undefined,
        domain: __prod__ ? undefined : undefined,
        // sameSite: "none",
        // secure: true, // cookie only works in https, if not using https in prod, you want it to be false. Also usually set it to false when trying to get things set up
      },
      // secret: process.env.SESSION_SECRET,
      secret: "3lMGIPkuu5#8O9ga$ywxI0zEVv3@6c**Gh5^9Nm5pcVHj0wyE4j#QChmEpLS",
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({
      req,
      res,
      redis,
      userLoader: createUserLoader(),
      voteLoader: createVoteLoader(),
    }),
  });

  await apolloServer.start();

  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  app.listen(`${+process.env.PORT}`, () => {
    console.log(`App now listening on Localhost: ${process.env.PORT}`);
  });
  // app.listen(+process.env.PORT, () => {
  //   console.log(`App now listening on Localhost:${+process.env.PORT}`);
  // });
};

main().catch((e) => {
  console.error(e);
});
