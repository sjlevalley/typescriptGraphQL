import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import { MikroORM } from "@mikro-orm/core";

export default {
  //   entities: ["./dist/entities/**/*.js"], // path to our JS entities (dist), relative to `baseDir`
  entities: [Post],
  //   entitiesTs: ["./src/entities/**/*.ts"],
  dbName: "lireddit",
  user: "postgres",
  password: "postgres",
  debug: !__prod__,
  type: "postgresql",
} as Parameters<typeof MikroORM.init>[0];
