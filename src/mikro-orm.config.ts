import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import { MikroORM } from "@mikro-orm/core";
import path from "path";

export default {
  migrations: {
    path: path.join(__dirname, "./migrations"),
    // pathTs: "src/migrations",
    pattern: /^[\w-]+\d+\.[tj]s$/,
  },
  // entities: ["./dist/entities/**/*.js"], // path to our JS entities (dist), relative to `baseDir`
  // entitiesTs: ["./src/entities/**/*.ts"],
  entities: [Post],
  dbName: "lireddit",
  user: "postgres",
  password: "postgres",
  debug: !__prod__,
  type: "postgresql",
} as Parameters<typeof MikroORM.init>[0];
// };

// import { EntityManager } from "@mikro-orm/postgresql";
// import type { PostgreSqlDriver } from "@mikro-orm/postgresql";
// import path from "path";

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
