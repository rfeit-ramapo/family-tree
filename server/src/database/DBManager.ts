import neo4j from "neo4j-driver";
import * as dotenv from "dotenv";
dotenv.config();

export default class DBManager {
  static driver = neo4j.driver(
    process.env.NEO4J_LINK as string,
    neo4j.auth.basic(
      process.env.NEO4J_USERNAME as string,
      process.env.NEO4J_PASSWORD as string
    ),
    { disableLosslessIntegers: true }
  );

  static db_name = process.env.NEO4J_DB as string;
}

// session = this.driver.session({database: DBManager.db_name})
