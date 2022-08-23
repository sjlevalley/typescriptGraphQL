"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@mikro-orm/core");
const Post_1 = require("./entities/Post");
const mikro_orm_config_1 = __importDefault(require("./mikro-orm.config"));
const main = async () => {
    const orm = await core_1.MikroORM.init(mikro_orm_config_1.default);
    await orm.getMigrator().up();
    const em = orm.em.fork();
    const post = {
        title: "My First Post",
        updatedAt: new Date(),
        createdAt: new Date(),
    };
    await em.create(Post_1.Post, post);
    const posts = await em.find(Post_1.Post, {});
    console.log(posts);
};
main().catch((e) => {
    console.error(e);
});
//# sourceMappingURL=index.js.map