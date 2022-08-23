import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import mikroConfig from "./mikro-orm.config";

const main = async () => {
  const orm = await MikroORM.init(mikroConfig);
  // const orm = await MikroORM.init<PostgreSqlDriver>({
  //   migrations: {
  //     path: path.join(__dirname, "./migrations"),
  //     // pathTs: "src/migrations",
  //     // pattern: /^[\w-]+\d+\.[tj]s$/,
  //   },
  //   //   entities: ["./dist/entities/**/*.js"], // path to our JS entities (dist), relative to `baseDir`
  //   //   entitiesTs: ["./src/entities/**/*.ts"],
  //   entities: [Post],
  //   dbName: "lireddit",
  //   user: "postgres",
  //   password: "postgres",
  //   debug: !__prod__,
  //   type: "postgresql",
  // });
  await orm.getMigrator().up();

  const em = orm.em.fork();
  const post = {
    title: "My First Post",
    updatedAt: new Date(),
    createdAt: new Date(),
  };

  // Add to database
  await em.create(Post, post);

  const posts = await em.find(Post, {});
  console.log(posts);
};

main().catch((e) => {
  console.error(e);
});
