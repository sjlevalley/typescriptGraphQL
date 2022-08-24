"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@mikro-orm/core");
const constants_1 = require("./constants");
const Post_1 = require("./entities/Post");
const path_1 = __importDefault(require("path"));
const main = async () => {
    const orm = await core_1.MikroORM.init({
        migrations: {
            path: path_1.default.join(__dirname, "./migrations"),
        },
        entities: [Post_1.Post],
        dbName: "lireddit",
        user: "postgres",
        password: "postgres",
        debug: !constants_1.__prod__,
        type: "postgresql",
    });
    await orm.getMigrator().up();
    const em = orm.em.fork();
    const post = em.create(Post_1.Post, {
        title: "My First Post",
        updatedAt: new Date(),
        createdAt: new Date(),
    });
    const posts = await em.find(Post_1.Post, {});
    console.log(posts);
};
main().catch((e) => {
    console.error(e);
});
//# sourceMappingURL=index.js.map