import { DateTime, Node } from "neo4j-driver";
import DBManager from "../DBManager";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export class DBTree extends DBManager {
  static formatTree({ tree: rawTree }: { tree: Tree }) {
    rawTree.dateCreated = (
      rawTree.dateCreated as unknown as DateTime
    ).toStandardDate();
    if (rawTree.lastModified)
      rawTree.lastModified = (
        rawTree.lastModified as unknown as DateTime
      ).toStandardDate();
    else rawTree.lastModified = rawTree.dateCreated;

    if (!rawTree.isPublic) rawTree.isPublic = false;

    return rawTree as Required<Tree>;
  }

  static formatFullTree(rawTree: TreeWithMembers) {
    rawTree.tree = DBTree.formatTree(rawTree);
    rawTree.focalPoint = rawTree.focalPoint
      ? ((rawTree.focalPoint as unknown as Node).properties as TreeMember)
      : undefined;
    if (rawTree.partner)
      rawTree.partner = rawTree.focalPoint
        ? ((rawTree.partner as unknown as Node).properties as TreeMember)
        : undefined;
    if (rawTree.parent1)
      rawTree.parent1 = rawTree.parent1
        ? ((rawTree.parent1 as unknown as Node).properties as TreeMember)
        : undefined;
    if (rawTree.parent2)
      rawTree.parent2 = rawTree.parent2
        ? ((rawTree.parent2 as unknown as Node).properties as TreeMember)
        : undefined;
    if (rawTree.siblings)
      rawTree.siblings = rawTree.siblings.map(
        (sibling) => (sibling as unknown as Node).properties as TreeMember
      );
    if (rawTree.halfSiblingsP1)
      rawTree.halfSiblingsP1 = rawTree.halfSiblingsP1.map(
        (sibling) => (sibling as unknown as Node).properties as TreeMember
      );
    if (rawTree.halfSiblingsP2)
      rawTree.halfSiblingsP2 = rawTree.halfSiblingsP2.map(
        (sibling) => (sibling as unknown as Node).properties as TreeMember
      );
    if (rawTree.partnerChildren)
      rawTree.partnerChildren = rawTree.partnerChildren.map(
        (child) => (child as unknown as Node).properties as TreeMember
      );
    if (rawTree.soloChildren)
      rawTree.soloChildren = rawTree.soloChildren.map(
        (child) => (child as unknown as Node).properties as TreeMember
      );

    return rawTree as TreeWithMembers & { tree: Required<Tree> };
  }

  static async getCreatorTrees(creator: string) {
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
    return this.formatQueryResultArray(result, this.formatTree);
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

    return this.formatQueryResultArray(result, this.formatTree);
  }

  static async updateModified(treeId: string) {
    const session = this.driver.session({ database: DBManager.db_name });

    // Path to the Cypher query file
    const queryPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "cypher_queries",
      "update_modified.cypher"
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
        t.run(query, { creator, name: treeName, id: uuidv4() })
      );
    } finally {
      await session.close();
    }

    return;
  }

  static async renameTree(treeName: string, treeId: string) {
    const session = this.driver.session({ database: DBManager.db_name });

    // Path to the Cypher query file
    const queryPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "cypher_queries",
      "rename_tree.cypher"
    );
    const query = fs.readFileSync(queryPath, "utf-8"); // Read the query string

    try {
      await session.executeWrite((t) =>
        t.run(query, { name: treeName, id: treeId })
      );
    } finally {
      await session.close();
    }

    return;
  }

  static async deleteTree(treeId: string) {
    const session = this.driver.session({ database: DBManager.db_name });

    // Path to the Cypher query file
    const queryPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "cypher_queries",
      "delete_tree.cypher"
    );
    const query = fs.readFileSync(queryPath, "utf-8"); // Read the query string

    try {
      await session.executeWrite((t) => t.run(query, { id: treeId }));
    } finally {
      await session.close();
    }

    return;
  }

  static async getTree(treeId: string) {
    const session = this.driver.session({ database: DBManager.db_name });

    // Path to the Cypher query file
    const queryPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "cypher_queries",
      "get_tree.cypher"
    );
    const query = fs.readFileSync(queryPath, "utf-8"); // Read the query string

    let result;

    try {
      result = await session.executeWrite((t) => t.run(query, { id: treeId }));
    } finally {
      await session.close();
    }

    return this.formatQueryResult(result, this.formatFullTree);
  }
}

export interface Tree {
  creator: string;
  name: string;
  id: string;
  dateCreated?: Date;
  lastModified?: Date;
  isPublic?: boolean;
}

export interface TreeMember {
  id: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  dateOfDeath?: Date;
  note?: string;
  gender?: string;
  location?: string;
  imageUrl?: string;
}

export interface TreeWithMembers {
  tree: Tree;
  focalPoint?: TreeMember;
  partner?: TreeMember;
  parent1?: TreeMember;
  parent2?: TreeMember;
  siblings?: TreeMember[];
  halfSiblingsP1?: TreeMember[];
  halfSiblingsP2?: TreeMember[];
  partnerChildren?: TreeMember[];
  soloChildren?: TreeMember[];
}
