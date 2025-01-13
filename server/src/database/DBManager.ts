import neo4j, { QueryResult } from "neo4j-driver";
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

  // Turns a Neo4j record into a single object
  static formatQueryResult<RawT, T>(
    result: QueryResult,
    formatter: (rec: RawT) => T
  ) {
    return formatter(result.records[0].toObject());
  }

  // Turns a Neo4j record into an array of objects
  static formatQueryResultArray<RawT, T>(
    result: QueryResult,
    formatter: (rec: RawT) => T
  ) {
    return result.records.map((rec) => formatter(rec.toObject()));
  }
}

// session = this.driver.session({database: DBManager.db_name})
