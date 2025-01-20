/**
 * This file contains the DBManager class, which is responsible for managing the connection to the Neo4j database.
 */

import neo4j, { QueryResult } from "neo4j-driver";
import * as dotenv from "dotenv";
dotenv.config();

/**
 * Class that manages the connection to the Neo4j database.
 */
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

  /**
   * NAME: formatQueryResult
   *
   * SYNOPSIS: formatQueryResult<RawT, T>(result: QueryResult, formatter: (rec: RawT) => T) => T
   *    result  --> the result of a query to the database
   *    formatter  --> a function that formats a raw object into a desired object
   *
   * DESCRIPTION:
   * Function to format the result of a query to the database into a single object.
   *
   * RETURNS: A single object formatted according to the formatter function.
   */
  static formatQueryResult<RawT, T>(
    result: QueryResult,
    formatter: (rec: RawT) => T
  ) {
    return formatter(result.records[0].toObject());
  }

  /**
   * NAME: formatQueryResultArray
   *
   * SYNOPSIS: formatQueryResultArray<RawT, T>(result: QueryResult, formatter: (rec: RawT) => T) => T[]
   *   result  --> the result of a query to the database
   *  formatter  --> a function that formats a raw object into a desired object
   *
   * DESCRIPTION:
   * Function to format the result of a query to the database into an array of objects.
   *
   * RETURNS: An array of objects formatted according to the formatter function.
   */
  static formatQueryResultArray<RawT, T>(
    result: QueryResult,
    formatter: (rec: RawT) => T
  ) {
    return result.records.map((rec) => formatter(rec.toObject()));
  }
}
