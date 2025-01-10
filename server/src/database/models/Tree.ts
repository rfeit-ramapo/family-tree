import { DateTime, QueryResult } from "neo4j-driver";
import DBManager from "../DBManager";
import fs from "fs";
import path from "path";

export class DBTree extends DBManager {
  // Convert query result into an array of Trees
  static formatResult(result: QueryResult) {
    return result.records.map((rec) => {
      const recObj = rec.toObject().tree as Tree;

      recObj.dateCreated = (
        recObj.dateCreated as unknown as DateTime
      ).toStandardDate();
      if (recObj.lastAccessed)
        recObj.lastAccessed = (
          recObj.lastAccessed as unknown as DateTime
        ).toStandardDate();
      else recObj.lastAccessed = recObj.dateCreated;

      return recObj;
    }) as Required<Tree>[];
  }

  static async get(creator: string) {
    const session = this.driver.session({ database: DBManager.db_name });

    // Path to the Cypher query file
    const queryPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "cypher_queries",
      "get_trees.cypher"
    );

    const query = fs.readFileSync(queryPath, "utf-8"); // Read the query string

    let result;

    try {
      result = await session.executeRead((t) => t.run(query, { id: creator }));
    } finally {
      await session.close();
    }

    return this.formatResult(result);
  }

  static async getShared(sharedWith: string) {
    const session = this.driver.session({ database: DBManager.db_name });
    let result;
    try {
      result = await session.executeRead((t) =>
        t.run(
          `MATCH (t:Tree)-[:SHARED_WITH]->(u:User {id: $id})
           RETURN t{.*} AS tree`,
          { id: sharedWith }
        )
      );
    } finally {
      await session.close();
    }

    return this.formatResult(result);
  }

  static async updateAccess(treeId: string) {
    const session = this.driver.session({ database: DBManager.db_name });

    // Path to the Cypher query file
    const queryPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "cypher_queries",
      "update_access.cypher"
    );

    const query = fs.readFileSync(queryPath, "utf-8"); // Read the query string

    try {
      await session.executeWrite((t) => t.run(query, { treeId }));
    } finally {
      await session.close();
    }
    return;
  }

  static async createTree(creator: string, treeName: string) {
    const session = this.driver.session({ database: DBManager.db_name });

    // Path to the Cypher query file
    const queryPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "cypher_queries",
      "create_tree.cypher"
    );
    const query = fs.readFileSync(queryPath, "utf-8"); // Read the query string

    try {
      await session.executeWrite((t) =>
        t.run(query, { userId: creator, name: treeName })
      );
    } finally {
      await session.close();
    }

    return;
  }
}

export default interface Tree {
  creator: string;
  name: string;
  id: string;
  dateCreated?: Date;
  lastAccessed?: Date;
}
