import { EntityManager, Connection, IDatabaseDriver } from "@mikro-orm/core";

export type MyContext = {
  em: EntityManager<IDatabaseDriver<Connection>>;
  //   em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>;
};
