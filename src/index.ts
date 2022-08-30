import "dotenv/config";
import "reflect-metadata";
import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./constants";
import mikroConfig from "./mikro-orm.config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import session from "express-session";
import { createClient } from "redis";
import connectRedis from "connect-redis";
import cors from "cors";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const main = async () => {
  const orm = await MikroORM.init(mikroConfig);

  await orm.getMigrator().up();
  const em = orm.em.fork();

  const app = express();

  let RedisStore = connectRedis(session);
  let redisClient = createClient({ legacyMode: true });
  redisClient.connect().catch(console.error);

  const corsOptions = {
    origin: "http://localhost:3000",
    credentials: true, // access-control-allow-credentials:true
  };

  // Apply cors to all routes
  app.use(cors(corsOptions));

  app.use(
    session({
      name: "qid",
      store: new RedisStore({
        client: redisClient,
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

  // app.set("trust proxy", true); //process.env.NODE_ENV !== "production");
  // app.set("Access-Control-Allow-Origin", [
  //   "https://studio.apollographql.com",
  //   "http://localhost:4000",
  //   "http://localhost:3000",
  // ]);
  // app.set("Access-Control-Allow-Credentials", true);

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({ em, req, res }),
  });

  await apolloServer.start();

  apolloServer.applyMiddleware({
    app,
    cors: false,
    // cors: {
    //   origin: [
    //     "https://studio.apollographql.com",
    //     // "http://localhost:4000",
    //     "http://localhost:3000",
    //   ],
    //   credentials: true,
    // },
  });

  // Added the followiing headers in the GraphQL Sandbox
  // Access-Control-Allow-Origin: ["https://studio.apollographql.com", "http://localhost:4000",]
  // Access-Control-Allow-Credentials: true
  // x-forwarded-proto: https

  app.listen(4000, () => {
    console.log("App now listening on Localhost:4000");
  });
};

main().catch((e) => {
  console.error(e);
});
