import { Request, Response } from "express";
import session from "express-session";
import { Redis } from "ioredis";
import { createVoteLoader } from "./utils/createVoteLoader";
import { createUserLoader } from "./utils/createUserLoader";

// This is used for the server/index.ts file
export type MyContext = {
  req: Request & { session: session.Session & { userId?: number } };
  res: Response;
  redis: Redis;
  userLoader: ReturnType<typeof createUserLoader>;
  voteLoader: ReturnType<typeof createVoteLoader>;
};
