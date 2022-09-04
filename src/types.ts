// import { EntityManager, Connection, IDatabaseDriver } from "@mikro-orm/core";
// import { Request, Response } from "express";

// export type MyContext = {
//   em: EntityManager<IDatabaseDriver<Connection>>;
//   req: Request;
//   res: Response;
// };

import { Request, Response } from "express";
import { EntityManager, Connection, IDatabaseDriver } from "@mikro-orm/core";
import session from "express-session";
import { Redis } from "ioredis";

export type MyContext = {
  em: EntityManager<IDatabaseDriver<Connection>>;
  req: Request & { session: session.Session & { userId?: number } };
  res: Response;
  redis: Redis;
};
