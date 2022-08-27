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

const main = async () => {
  const orm = await MikroORM.init(mikroConfig);

  await orm.getMigrator().up();
  const em = orm.em.fork();

  const app = express();

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: () => ({ em }),
  });

  await apolloServer.start();

  apolloServer.applyMiddleware({ app });

  // const post = em.create(Post, {
  //   title: "My First Post",
  //   updatedAt: new Date(),
  //   createdAt: new Date(),
  // });

  // Add to database
  // em.persistAndFlush(post);

  // const posts = await em.find(Post, {});
  // console.log(posts);

  app.listen(4000, () => {
    console.log("App now listening on Localhost:4000");
  });
};

main().catch((e) => {
  console.error(e);
});
