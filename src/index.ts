import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import mikroConfig from "./mikro-orm.config";
import { EntityManager } from "@mikro-orm/postgresql";
import { IDatabaseDriver } from "@mikro-orm/core/drivers/IDatabaseDriver";

const main = async () => {
  const orm = await MikroORM.init<IDatabaseDriver>(mikroConfig);
  const em = orm.em as EntityManager;
  //   const qb = em.createQueryBuilder(...);

  // Create an instance of Post object (does nothing to database)
  //   const post = orm.em.create(Post, {
  //     title: "My First Post",
  //     updatedAt: new Date(),
  //     createdAt: new Date(),
  //   });
  const post = new Post();

  // Add to database
  //   await orm.em.persistAndFlush(post);
};

main().catch((e) => {
  console.error(e);
});
