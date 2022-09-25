import "dotenv/config";
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
import { Updoot } from "./entities/Updoot";
// import { sendEmail } from "./utils/sendEmail";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}
//
export const typormConnection = new DataSource({
  type: "postgres",
  database: "lireddit2",
  username: "postgres",
  password: "postgres",
  logging: true,
  synchronize: true,
  entities: [Post, User, Updoot],
  migrations: [path.join(__dirname, "./migrations/*")],
});

const main = async () => {
  // sendEmail("usmariner@proton.me", "Hello There");

  await typormConnection
    .initialize()
    .then(() => {
      console.log("Data Source has been initialized!");
    })
    .catch((err) => {
      console.error("Error during Data Source initialization", err);
    });
  await typormConnection.runMigrations();

  // await Post.delete({}); // delete posts from DB

  const app = express();
  const redis = new Redis();

  let RedisStore = connectRedis(session);

  const corsOptions = {
    // origin: "http://localhost:3000",
    origin: [
      "https://studio.apollographql.com",
      "http://localhost:4000",
      "http://localhost:3000",
    ],
    credentials: true, // access-control-allow-credentials:true
  };

  // Apply cors to all routes
  app.use(cors(corsOptions));

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
        httpOnly: true,
        sameSite: "lax",
        secure: __prod__,
        // sameSite: "none",
        // secure: true, // cookie only works in https, if not using https in prod, you want it to be false. Also usually set it to false when trying to get things set up
      },
      // secret: process.env.REDIS_SECRET,
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
    }),
  });

  await apolloServer.start();

  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  app.listen(4000, () => {
    console.log("App now listening on Localhost:4000");
  });
};

main().catch((e) => {
  console.error(e);
});
