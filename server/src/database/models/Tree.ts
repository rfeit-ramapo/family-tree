import { DateTime, Node, Path } from "neo4j-driver";
import DBManager from "../DBManager";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export class DBTree extends DBManager {
  static formatTree(rawObject: { tree: Tree } | { metadata: Tree }) {
    const rawTree =
      "metadata" in rawObject ? rawObject.metadata : rawObject.tree;

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
    rawTree.metadata = DBTree.formatTree(rawTree);
    rawTree.root = rawTree.root
      ? ((rawTree.root as unknown as Node).properties as TreeMember)
      : undefined;
    rawTree.focal = rawTree.focal
      ? ((rawTree.focal as unknown as Node).properties as TreeMember)
      : undefined;
    if (rawTree.partner)
      rawTree.partner = rawTree.root
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

    return rawTree as TreeWithMembers;
  }

  static formatPersonDetails(rawPerson: RawPerson): PersonDetails {
    return {
      person: rawPerson.person.properties as TreeMember,
      relationPath: rawPerson.isRoot
        ? "self"
        : rawPerson.relationPath
        ? DBTree.pathToString(
            rawPerson.relationPath,
            rawPerson.person.properties.gender
          )
        : "unrelated",
      parents: rawPerson.parents.map(
        (parent) => parent.properties as TreeMember
      ),
      currentPartner: rawPerson.currentPartner
        ? (rawPerson.currentPartner.properties as TreeMember)
        : undefined,
      partners: rawPerson.partners.map(
        (partner) => partner.properties as TreeMember
      ),
      children: rawPerson.children.map(
        (child) => child.properties as TreeMember
      ),
      creator: rawPerson.creator,
      isRoot: rawPerson.isRoot,
      isPublic: rawPerson.isPublic,
      viewers: rawPerson.viewers,
      editors: rawPerson.editors,
    };
  }

  static formatSuggestions(rawSuggestions: RawSuggestions) {
    return {
      firstSuggestions: rawSuggestions.firstSuggestions.map(
        (suggestion) => suggestion.properties as TreeMember
      ),
      otherSuggestions: rawSuggestions.otherSuggestions.map(
        (suggestion) => suggestion.properties as TreeMember
      ),
    };
  }

  static pathToString(path: Path, gender = "neutral") {
    let code: string = "";
    const segments = path.segments;
    for (const segment of segments) {
      if (segment.relationship.type === "PARENT_OF") {
        const startNode = segment.start.elementId;
        const relationshipStart = segment.relationship.startNodeElementId;
        // If the start is the parent, add a 0; if start is child, add 1
        if (startNode === relationshipStart) code += "0";
        else code += "1";
      } else {
        // If not a parent-child relationship, add 3 (partner)
        code += "3";
      }
    }
    // Replace all instances of '10' with '2', representing a sibling
    code = code.replace(/10/g, "2");

    return this.calculateGenderedRelationship(code, gender);
  }

  static calculateRelationship(code: string) {
    if (code == "3") return "spouse";
    if (/^30+$/.test(code)) return "unrelated"; // don't want to double-count shared children
    let sInlaw = false;
    let eInlaw = false;
    let inlaw = "";
    if (code.startsWith("3")) {
      sInlaw = true; // spouse starts chain
      inlaw = "-in-law";
      code = code.slice(1);
    }
    if (code.endsWith("3")) {
      eInlaw = true; // spouse ends chain
      inlaw = "-in-law";
      code = code.slice(0, -1);
    }

    // direct descendant
    if (/^0+$/.test(code)) {
      if (code == "0") return "child" + inlaw;
      else if (code == "00") return "grandchild" + inlaw;
      else {
        let str = "grandchild";
        const greatnum = code.length - 2;
        for (let i = 0; i < greatnum; i++) {
          str = "great-" + str;
        }
        return str + inlaw;
      }
    }
    // direct ancestor
    else if (/^1+$/.test(code)) {
      if (code == "1") return "parent" + inlaw;
      else if (code == "11") return "grandparent" + inlaw;
      else {
        let str = "grandparent";
        const greatnum = code.length - 2;
        for (let i = 0; i < greatnum; i++) {
          str = "great-" + str;
        }
        return str + inlaw;
      }
    }
    // sibling
    else if (code == "2") return "sibling" + inlaw;
    // auncle
    else if (/^1+2$/.test(code)) {
      if (code == "12") return "auncle" + (sInlaw ? inlaw : "");
      // spouse of your uncle is still your uncle, not your uncle-in-law
      else {
        let str = "auncle";
        const greatnum = code.length - 2;
        for (let i = 0; i < greatnum; i++) {
          str = "great-" + str;
        }
        return str + (sInlaw ? inlaw : "");
      }
    }
    // nibling
    else if (/^20+$/.test(code)) {
      if (code == "20")
        return "nibling" + (eInlaw ? inlaw : ""); // opposite of uncle situation
      else if (code == "200") return "grandnibling" + (eInlaw ? inlaw : "");
      else {
        let str = "grandnibling";
        const greatnum = code.length - 3;
        for (let i = 0; i < greatnum; i++) {
          str = "great-" + str;
        }
        return str + (eInlaw ? inlaw : "");
      }
    }
    // cousin
    else if (/^1+20+/.test(code)) {
      const degree = Math.min(
        code.indexOf("2"),
        code.length - code.indexOf("2") - 1
      );
      const removed = code.length - degree * 2 - 1;
      // English is annoying
      let degreeString;
      if (
        degree.toString().endsWith("11") ||
        degree.toString().endsWith("12") ||
        degree.toString().endsWith("13")
      )
        degreeString = "th";
      else if (degree.toString().endsWith("1")) degreeString = "st";
      else if (degree.toString().endsWith("2")) degreeString = "nd";
      else if (degree.toString().endsWith("3")) degreeString = "rd";
      else degreeString = "th";

      if (removed > 0)
        return `${degree}${degreeString} cousin ${removed}x removed` + inlaw;
      else return `${degree}${degreeString} cousin` + inlaw;
    }
    // invalid
    else return "unrelated";
  }

  static calculateGenderedRelationship(code: string, gender = "neutral") {
    const relationship = this.calculateRelationship(code);
    if (gender == "neutral") return relationship;
    return relationship
      .replace("parent", gender == "feminine" ? "mother" : "father")
      .replace("sibling", gender == "feminine" ? "sister" : "brother")
      .replace("auncle", gender == "feminine" ? "aunt" : "uncle")
      .replace("nibling", gender == "feminine" ? "niece" : "nephew")
      .replace("child", gender == "feminine" ? "daughter" : "son")
      .replace("spouse", gender == "feminine" ? "wife" : "husband");
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

  static async getTree(treeId: string, focalId?: string) {
    console.log("Getting tree with focalId: ", focalId);
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
      result = await session.executeWrite((t) =>
        t.run(query, { id: treeId, focalId: focalId || null })
      );
    } finally {
      await session.close();
    }

    const test = DBTree.formatQueryResult(result, DBTree.formatFullTree);
    return test;
  }

  static async togglePublic(userId: string, treeId: string) {
    const session = this.driver.session({ database: DBManager.db_name });

    // Path to the Cypher query file
    const queryPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "cypher_queries",
      "toggle_public.cypher"
    );
    const query = fs.readFileSync(queryPath, "utf-8");

    try {
      await session.executeWrite((t) => t.run(query, { id: treeId, userId }));
    } finally {
      await session.close();
    }

    return;
  }

  static async getPersonDetails(personId: string, rootId = "") {
    const session = this.driver.session({ database: DBManager.db_name });

    // Path to the cypher query file
    const queryPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "cypher_queries",
      "person_info.cypher"
    );
    const query = fs.readFileSync(queryPath, "utf-8");

    let result;
    try {
      result = await session.executeWrite((t) =>
        t.run(query, { id: personId, rootId })
      );
    } finally {
      await session.close();
    }

    return this.formatQueryResult(result, DBTree.formatPersonDetails);
  }

  static async updatePerson(person: TreeMember) {
    const session = this.driver.session({ database: DBManager.db_name });

    // Path to the cypher query file
    const queryPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "cypher_queries",
      "update_person.cypher"
    );
    const query = fs.readFileSync(queryPath, "utf-8");

    try {
      await session.executeWrite((t) =>
        t.run(query, {
          id: person.id,
          firstName: person.firstName ?? null,
          middleName: person.middleName ?? null,
          lastName: person.lastName ?? null,
          dateOfBirth: person.dateOfBirth
            ? DateTime.fromStandardDate(person.dateOfBirth)
            : null,
          dateOfDeath: person.dateOfDeath
            ? DateTime.fromStandardDate(person.dateOfDeath)
            : null,
          note: person.note ?? null,
          gender: person.gender ?? null,
          location: person.location ?? null,
          imageUrl: person.imageUrl ?? null,
        })
      );
    } finally {
      await session.close();
    }

    return;
  }

  static async createPerson(treeId: string, isRoot: boolean) {
    const session = this.driver.session({ database: DBManager.db_name });

    // Path to the cypher query file
    const queryPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "cypher_queries",
      "create_person.cypher"
    );
    const query = fs.readFileSync(queryPath, "utf-8");

    const personId = uuidv4();
    try {
      await session.executeWrite((t) =>
        t.run(query, {
          treeId,
          id: personId,
        })
      );
      if (isRoot) {
        await this.switchRoot(personId, true);
      }
    } finally {
      await session.close();
    }

    return { id: personId };
  }

  static async addRelation(
    originId: string,
    targetId: string,
    relation: "PARENT_OF" | "PARTNER_OF"
  ) {
    const session = this.driver.session({ database: DBManager.db_name });

    // Path to the cypher query file
    const queryPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "cypher_queries",
      "add_relation.cypher"
    );
    const query = fs
      .readFileSync(queryPath, "utf-8")
      .replace(/\brelation\b/g, relation);

    try {
      await session.executeWrite((t) =>
        t.run(query, {
          originId,
          targetId,
          relation,
        })
      );
    } finally {
      await session.close();
    }

    return;
  }

  static async toggleCurrentPartner(originId: string, targetId: string) {
    const session = this.driver.session({ database: DBManager.db_name });

    // Path to the cypher query file
    const queryPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "cypher_queries",
      "edit_current_partner.cypher"
    );
    const query = fs.readFileSync(queryPath, "utf-8");

    try {
      await session.executeWrite((t) =>
        t.run(query, {
          p1Id: originId,
          p2Id: targetId,
        })
      );
    } finally {
      await session.close();
    }

    return;
  }

  static async removeRelation(originId: string, targetId: string) {
    console.log("Removing relation between ", originId, " and ", targetId);
    const session = this.driver.session({ database: DBManager.db_name });

    // Path to the cypher query file
    const queryPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "cypher_queries",
      "remove_relation.cypher"
    );

    const query = fs.readFileSync(queryPath, "utf-8");

    try {
      await session.executeWrite((t) =>
        t.run(query, {
          originId,
          targetId,
        })
      );
    } finally {
      await session.close();
    }

    return;
  }

  static async removePerson(personId: string) {
    const session = this.driver.session({ database: DBManager.db_name });

    // Path to the cypher query file
    const queryPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "cypher_queries",
      "remove_person.cypher"
    );

    const query = fs.readFileSync(queryPath, "utf-8");

    try {
      await session.executeWrite((t) =>
        t.run(query, {
          personId,
        })
      );
    } finally {
      await session.close();
    }

    return;
  }

  static async getSuggestedRelations(
    originId: string,
    relation: "children" | "partners" | "parents"
  ) {
    const session = this.driver.session({ database: DBManager.db_name });

    // Path to the cypher query file
    const queryFile =
      relation === "parents"
        ? "suggest_parents.cypher"
        : relation === "children"
        ? "suggest_children.cypher"
        : "suggest_partners.cypher";

    const queryPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "cypher_queries",
      queryFile
    );
    const query = fs.readFileSync(queryPath, "utf-8");

    let result;
    try {
      result = await session.executeRead((t) =>
        t.run(query, {
          id: originId,
        })
      );
    } finally {
      await session.close();
    }

    return DBTree.formatQueryResult(result, DBTree.formatSuggestions);
  }

  static async getPeople(treeId: string) {
    const session = this.driver.session({ database: DBManager.db_name });

    // Path to the cypher query file
    const queryPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "cypher_queries",
      "get_people.cypher"
    );
    const query = fs.readFileSync(queryPath, "utf-8");

    let result;
    try {
      result = await session.executeRead((t) =>
        t.run(query, {
          id: treeId,
        })
      );
    } finally {
      await session.close();
    }
    const peopleArray = result.records[0].toObject().people as Node[];
    return peopleArray.map((rawObject: Node) => {
      return rawObject.properties as TreeMember;
    });
  }

  static async switchRoot(personId: string, isRoot: boolean) {
    const session = this.driver.session({ database: DBManager.db_name });

    // Path to the cypher query file
    const queryFile = isRoot ? "switch_root.cypher" : "remove_root.cypher";
    const queryPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "cypher_queries",
      queryFile
    );
    const query = fs.readFileSync(queryPath, "utf-8");

    try {
      await session.executeWrite((t) =>
        t.run(query, {
          id: personId,
        })
      );
    } finally {
      await session.close();
    }

    return;
  }
}

export interface Tree {
  creator: string;
  name: string;
  id: string;
  editors: string[];
  viewers: string[];
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
  metadata: Tree;
  root?: TreeMember;
  focal?: TreeMember;
  partner?: TreeMember;
  parent1?: TreeMember;
  parent2?: TreeMember;
  siblings?: TreeMember[];
  halfSiblingsP1?: TreeMember[];
  halfSiblingsP2?: TreeMember[];
  partnerChildren?: TreeMember[];
  soloChildren?: TreeMember[];
}

interface RawPerson {
  person: Node;
  relationPath: Path | null;
  parents: Node[];
  currentPartner: Node | null;
  partners: Node[];
  children: Node[];
  isRoot: boolean;
  isPublic: boolean;
  creator: string;
  viewers: string[];
  editors: string[];
}

export interface PersonDetails {
  person: TreeMember;
  relationPath: string;
  parents: TreeMember[];
  currentPartner?: TreeMember;
  partners: TreeMember[];
  children: TreeMember[];
  isRoot: boolean;
  isPublic: boolean;
  creator: string;
  viewers: string[];
  editors: string[];
}

interface RawSuggestions {
  firstSuggestions: Node[];
  otherSuggestions: Node[];
}
