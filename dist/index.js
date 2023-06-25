"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.typormConnection = void 0;
require("dotenv-safe/config");
require("reflect-metadata");
const constants_1 = require("./constants");
const express_1 = __importDefault(require("express"));
const apollo_server_express_1 = require("apollo-server-express");
const type_graphql_1 = require("type-graphql");
const hello_1 = require("./resolvers/hello");
const post_1 = require("./resolvers/post");
const user_1 = require("./resolvers/user");
const express_session_1 = __importDefault(require("express-session"));
const ioredis_1 = __importDefault(require("ioredis"));
const connect_redis_1 = __importDefault(require("connect-redis"));
const cors_1 = __importDefault(require("cors"));
const typeorm_1 = require("typeorm");
const Post_1 = require("./entities/Post");
const User_1 = require("./entities/User");
const path_1 = __importDefault(require("path"));
const Vote_1 = require("./entities/Vote");
const createUserLoader_1 = require("./utils/createUserLoader");
const createVoteLoader_1 = require("./utils/createVoteLoader");
const postgresDatabaseUrl = process.env.DATABASE_URL;
exports.typormConnection = new typeorm_1.DataSource({
    type: "postgres",
    url: postgresDatabaseUrl,
    logging: true,
    entities: [Post_1.Post, User_1.User, Vote_1.Vote],
    migrations: [path_1.default.join(__dirname, "./migrations/*")],
});
const main = async () => {
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
            await exports.typormConnection.initialize();
            console.log("Data Source has been initialized!");
            break;
        }
        catch (error) {
            console.error("Error during Data Source initialization", error);
            retriesPostgres -= 1;
            console.log(`${retriesPostgres} RETRIES REMAINING`);
            await new Promise((res) => setTimeout(res, retryDelay));
        }
    }
    await exports.typormConnection.runMigrations();
    const app = (0, express_1.default)();
    const redis = new ioredis_1.default();
    let RedisStore = (0, connect_redis_1.default)(express_session_1.default);
    const corsOptions = {
        origin: `${process.env.CORS_ORIGIN}`,
        credentials: true,
    };
    app.set("proxy", 1);
    app.use((0, cors_1.default)(corsOptions));
    app.use((0, express_session_1.default)({
        name: constants_1.COOKIE_NAME,
        store: new RedisStore({
            client: redis,
            disableTouch: true,
            port: 6379,
        }),
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            domain: constants_1.__prod__ ? undefined : undefined,
        },
        secret: "3lMGIPkuu5#8O9ga$ywxI0zEVv3@6c**Gh5^9Nm5pcVHj0wyE4j#QChmEpLS",
        resave: false,
    }));
    const apolloServer = new apollo_server_express_1.ApolloServer({
        schema: await (0, type_graphql_1.buildSchema)({
            resolvers: [hello_1.HelloResolver, post_1.PostResolver, user_1.UserResolver],
            validate: false,
        }),
        context: ({ req, res }) => ({
            req,
            res,
            redis,
            userLoader: (0, createUserLoader_1.createUserLoader)(),
            voteLoader: (0, createVoteLoader_1.createVoteLoader)(),
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
};
main().catch((e) => {
    console.error(e);
});
//# sourceMappingURL=index.js.map