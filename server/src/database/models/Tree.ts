/**
 * File contains the logic for managing database operations related to trees.
 */

import { DateTime, Node, Path } from "neo4j-driver";
import DBManager from "../DBManager";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * Interface for a tree object.
 * Holds metadata about a tree.
 */
export interface Tree {
  // The creator of the tree
  creator: string;
  // The name of the tree
  name: string;
  // The unique id of the tree
  id: string;
  // An array of the editors of the tree
  editors: string[];
  // An array of the viewers of the tree
  viewers: string[];
  // The date the tree was created
  dateCreated?: Date;
  // The date the tree was last modified
  lastModified?: Date;
  // Whether the tree is public or private
  isPublic?: boolean;
}

/**
 * Interface for a tree member object.
 * Holds information about a member of a tree.
 */
export interface TreeMember {
  // The unique id of the member
  id: string;
  // The first name of the member
  firstName?: string;
  // The middle name of the member
  middleName?: string;
  // The last name of the member
  lastName?: string;
  // The date of birth of the member
  dateOfBirth?: Date;
  // The date of death of the member
  dateOfDeath?: Date;
  // The note for the member
  note?: string;
  // The gender of the member
  gender?: string;
  // The location of the member
  location?: string;
  // The image url of the member's profile picture
  imageUrl?: string;
}

/**
 * Interface for a tree member object.
 */
export interface TreeWithMembers {
  // The metadata of the tree
  metadata: Tree;
  // The root of the tree
  root?: TreeMember;
  // The focal person of the tree
  focal?: TreeMember;
  // The partner of the focal person
  partner?: TreeMember;
  // The first parent of the focal person
  parent1?: TreeMember;
  // The second parent of the focal person
  parent2?: TreeMember;
  // The siblings of the focal person
  siblings?: TreeMember[];
  // The half siblings of the focal person from parent1
  halfSiblingsP1?: TreeMember[];
  // The half siblings of the focal person from parent2
  halfSiblingsP2?: TreeMember[];
  // The children of the focal person and their partners
  partnerChildren?: TreeMember[];
  // The children of the focal person without partners
  soloChildren?: TreeMember[];
}

/**
 * Interface for a raw person object.
 * This is the object returned from the database before
 * being formatted into a PersonDetails object.
 */
interface RawPerson {
  // The person object
  person: Node;
  // The path to the root of the tree
  relationPath: Path | null;
  // The parents of the person
  parents: Node[];
  // The current partner of the person
  currentPartner: Node | null;
  // The partners of the person
  partners: Node[];
  // The children of the person
  children: Node[];
  // Whether the person is the root of the tree
  isRoot: boolean;
  // Whether the person is publicly viewable
  isPublic: boolean;
  // The creator of the tree
  creator: string;
  // The viewers of the person
  viewers: string[];
  // The editors of the person
  editors: string[];
}

/**
 * Interface for a person details object.
 * Holds information about a member, their direct relations,
 * and some metadata about access permissions and the tree.
 */
export interface PersonDetails {
  // Holds biographical information on the person
  person: TreeMember;
  // The relationship between the person and the root of the tree
  relationPath: string;
  // The parent(s) of the person
  parents: TreeMember[];
  // The current partner of the person
  currentPartner?: TreeMember;
  // All saved partners of the person
  partners: TreeMember[];
  // The children of the person
  children: TreeMember[];
  // Whether this person is the root of the tree
  isRoot: boolean;
  // Whether this person is publicly viewable
  isPublic: boolean;
  // The id of the creator of the tree that holds this person
  creator: string;
  // A list of users who can view this person
  viewers: string[];
  // A list of users who can edit this person
  editors: string[];
}

/**
 * Holds the raw suggestions for people to connect to returned from the database.
 */
interface RawSuggestions {
  // The top suggestions
  firstSuggestions: Node[];
  // All additional suggestions
  otherSuggestions: Node[];
}

/**
 * Class to manage database operations related to trees.
 */
export class DBTree extends DBManager {
  /**
   * NAME: formatTree
   *
   * SYNOPSIS: static formatTree(rawObject: { tree: Tree } | { metadata: Tree }): Required<Tree>
   *    rawObject   --> An object containing a tree or metadata property that holds the tree.
   *
   * DESCRIPTION
   *   This function takes in an object containing a tree or metadata property that holds the tree
   *   and formats the tree object to ensure that all required properties are present and have the
   *   correct types. The function will return the formatted tree object.
   *
   * RETURNS
   *  A Required<Tree> object that has all required properties and types.
   */
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
  /* formatTree */

  /**
   * NAME: formatFullTree
   *
   * SYNOPSIS: static formatFullTree(rawTree: TreeWithMembers): TreeWithMembers
   *    rawTree  --> The tree object to format.
   *
   * DESCRIPTION
   *   This function takes in a tree object with members and formats the object to ensure that
   *   all properties are present and have the correct types. The function will return the
   *   formatted tree object.
   *
   * RETURNS
   *  A TreeWithMembers object that has all required properties and types.
   */
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
  /* formatFullTree */

  /**
   * NAME: formatPersonDetails
   *
   * SYNOPSIS: static formatPersonDetails(rawPerson: RawPerson): PersonDetails
   *    rawPerson  --> The raw person object to format.
   *
   * DESCRIPTION
   *   This function takes in a raw person object and formats the object to ensure that
   *   all properties are present and have the correct types. The function will return the
   *   formatted person object.
   *
   * RETURNS
   *  A PersonDetails object that has all required properties and types.
   */
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
  /* formatPersonDetails */

  /**
   * NAME: formatSuggestions
   *
   * SYNOPSIS: static formatSuggestions(rawSuggestions: RawSuggestions): { firstSuggestions: TreeMember[], otherSuggestions: TreeMember[] }
   *   rawSuggestions  --> The raw suggestions object to format.
   *
   * DESCRIPTION
   *  This function takes in a raw suggestions object and formats the object to ensure that
   * all properties are present and have the correct types. The function will return the
   * formatted suggestions object.
   *
   * RETURNS
   * An object containing the firstSuggestions and otherSuggestions arrays with all required properties and types.
   */
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
  /* formatSuggestions */

  /**
   * NAME: pathToString
   *
   * SYNOPSIS: static pathToString(path: Path, gender = "neutral"): string
   *   path   --> The path to convert to a string.
   *   gender --> The gender of the person to calculate the relationship for.
   *
   * DESCRIPTION
   * This function takes in a path object and converts it to a string representation of the relationship. The result will be based on the gender of the person, with the default being neutral.
   *
   * RETURNS
   * A string representation of the relationship between the start and end nodes of the path.
   */
  static pathToString(path: Path, gender = "neutral") {
    // Set the gender depending on input
    if (gender.toLowerCase() === "male") gender = "masculine";
    else if (gender.toLowerCase() === "female") gender = "feminine";
    else gender = "neutral";

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
  /* pathToString */

  /**
   * NAME: calculateRelationship
   *
   * SYNOPSIS: static calculateRelationship(code: string): string
   *   code  --> The code to calculate the relationship from.
   *
   * DESCRIPTION
   * This function takes in a code and calculates the relationship between two people based on the code. The code is a string representation of the path between two people.
   *
   * RETURNS
   * A string representation of the relationship between the two people.
   */
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
  /* calculateRelationship */

  /**
   * NAME: calculateGenderedRelationship
   *
   * SYNOPSIS: static calculateGenderedRelationship(code: string, gender = "neutral"): string
   *    code    --> The code to calculate the relationship from.
   *    gender  --> The gender of the person to calculate the relationship for.
   *
   * DESCRIPTION
   * This function takes in a code and calculates the relationship between two people based
   * on the code. The code is a string representation of the path between two people. The
   * function will return the relationship between the two people, with the relationship
   * being gendered if one is supplied.
   *
   * RETURNS
   * A string representation of the relationship between the two people.
   */
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
  /* calculateGenderedRelationship */

  /**
   * NAME: getCreatorTrees
   *
   * SYNOPSIS: static getCreatorTrees(creator: string) => Promise<Required<Tree>>
   *    creator    --> The id of the creator to get the trees for.
   *
   * DESCRIPTION
   * This function takes in the id of a creator and retrieves all the trees that the
   * creator has created. The function will return an array of tree objects.
   *
   * RETURNS
   * A promise containing an array of tree objects that the creator has created.
   */
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
    const query = fs.readFileSync(queryPath, "utf-8");

    let result;

    try {
      result = await session.executeRead((t) => t.run(query, { id: creator }));
    } finally {
      await session.close();
    }
    return this.formatQueryResultArray(result, this.formatTree);
  }

  /**
   * NAME: updateModified
   *
   * SYNOPSIS: static updateModified(treeId: string) => Promise<void>
   *    treeId    --> The id of the tree to update the last modified date for.
   *
   * DESCRIPTION
   * This function takes in the id of a tree and updates the last modified date for the tree.
   *
   * RETURNS
   * A promise that resolves when the last modified date has been updated.
   */
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
  /* updateModified */

  /**
   * NAME: createTree
   *
   * SYNOPSIS: static createTree(creator: string, treeName: string) => Promise<void>
   *    creator   --> The id of the creator of the tree.
   *    treeName  --> The name of the tree to create.
   *
   * DESCRIPTION
   * This function takes in the id of the creator and the name of the tree to create a new tree
   * in the database. The function will return when the tree has been created.
   *
   * RETURNS
   * A promise that resolves when the tree has been created.
   */
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
  /* createTree */

  /**
   * NAME: renameTree
   *
   * SYNOPSIS: static renameTree(treeName: string, treeId: string) => Promise<void>
   *    treeName  --> The new name for the tree.
   *    treeId    --> The id of the tree to rename.
   *
   * DESCRIPTION
   * This function takes in the new name for a tree and the id of the tree to rename. The function
   * will update the name of the tree in the database.
   *
   * RETURNS
   * A promise that resolves when the tree has been renamed.
   */
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
  /* renameTree */

  /**
   * NAME: deleteTree
   *
   * SYNOPSIS: static deleteTree(treeId: string) => Promise<void>
   *    treeId  --> The id of the tree to delete.
   *
   * DESCRIPTION
   * This function takes in the id of a tree and deletes the tree from the database.
   *
   * RETURNS
   * A promise that resolves when the tree has been deleted.
   */
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
  /* deleteTree */

  /**
   * NAME: getTree
   *
   * SYNOPSIS: static getTree(treeId: string, focalId?: string) => Promise<TreeWithMembers>
   *    treeId    --> The id of the tree to get.
   *    focalId   --> The id of the focal person to get the tree for.
   *
   * DESCRIPTION
   * This function takes in the id of a tree and retrieves the tree from the database. The function
   * will return the tree object.
   *
   * RETURNS
   * A promise containing the tree object.
   */
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

    return DBTree.formatQueryResult(result, DBTree.formatFullTree);
  }
  /* getTree */

  /**
   * NAME: togglePublic
   *
   * SYNOPSIS: static togglePublic(userId: string, treeId: string) => Promise<void>
   *    userId  --> The id of the user toggling the public status.
   *    treeId  --> The id of the tree to toggle the public status for.
   *
   * DESCRIPTION
   * This function takes in the id of a user and the id of a tree and toggles the public
   * status of the tree. The function will return when the public status has been toggled.
   *
   * RETURNS
   * A promise that resolves when the public status has been toggled.
   */
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
  /* togglePublic */

  /**
   * NAME: getPersonDetails
   *
   * SYNOPSIS: static getPersonDetails(personId: string, rootId = "") => Promise<PersonDetails>
   *    personId  --> The id of the person to get details for.
   *    rootId    --> The id of the root of the tree.
   *
   * DESCRIPTION
   * This function takes in the id of a person and retrieves the details of the person from
   * the database. The function will return the person details object.
   *
   * RETURNS
   * A promise containing the person details object.
   */
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
  /* getPersonDetails */

  /**
   * NAME: updatePerson
   *
   * SYNOPSIS: static updatePerson(person: TreeMember) => Promise<void>
   *    person  --> The person object to update.
   *
   * DESCRIPTION
   * This function takes in a person object and updates the person in the database.
   *
   * RETURNS
   * A promise that resolves when the person has been updated.
   */
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
          dateOfBirth:
            person.dateOfBirth instanceof Date
              ? DateTime.fromStandardDate(person.dateOfBirth)
              : person.dateOfBirth ?? null,
          dateOfDeath:
            person.dateOfDeath instanceof Date
              ? DateTime.fromStandardDate(person.dateOfDeath)
              : person.dateOfDeath ?? null,
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
  /* updatePerson */

  /**
   * NAME: createPerson
   *
   * SYNOPSIS: static createPerson(treeId: string, isRoot: boolean) => Promise<{ id: string }>
   *    treeId  --> The id of the tree to create the person in.
   *    isRoot  --> Whether the person is the root of the tree.
   *
   * DESCRIPTION
   * This function takes in the id of a tree and whether the person is the root of the tree.
   * The function will create a new person in the tree and return the id of the person.
   *
   * RETURNS
   * A promise containing the id of the person that was created.
   */
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
  /* createPerson */

  /**
   * NAME: addRelation
   *
   * SYNOPSIS: static addRelation(originId: string, targetId: string, relation: "PARENT_OF" | "PARTNER_OF") => Promise<void>
   *    originId  --> The id of the origin person.
   *    targetId  --> The id of the target person.
   *    relation  --> The relation to add between the two people.
   *
   * DESCRIPTION
   * This function takes in the id of two people and a relation to add between the two people.
   * The function will add the relation between the two people.
   *
   * RETURNS
   * A promise that resolves when the relation has been added.
   */
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
  /* addRelation */

  /**
   * NAME: toggleCurrentPartner
   *
   * SYNOPSIS: static toggleCurrentPartner(originId: string, targetId: string) => Promise<void>
   *    originId  --> The id of the origin person.
   *    targetId  --> The id of the target person.
   *
   * DESCRIPTION
   * This function takes in the id of two people and toggles the current partner status between
   * the two people.
   *
   * RETURNS
   * A promise that resolves when the current partner status has been toggled.
   */
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
  /* toggleCurrentPartner */

  /**
   * NAME: removeRelation
   *
   * SYNOPSIS: static removeRelation(originId: string, targetId: string) => Promise<void>
   *    originId  --> The id of the origin person.
   *    targetId  --> The id of the target person.
   *
   * DESCRIPTION
   * This function takes in the id of two people and removes the relation between the two people.
   *
   * RETURNS
   * A promise that resolves when the relation has been removed.
   */
  static async removeRelation(originId: string, targetId: string) {
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
  /* removeRelation */

  /**
   * NAME: removePerson
   *
   * SYNOPSIS: static removePerson(personId: string) => Promise<void>
   *    personId  --> The id of the person to remove.
   *
   * DESCRIPTION
   * This function takes in the id of a person and removes the person from the database.
   *
   * RETURNS
   * A promise that resolves when the person has been removed.
   */
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
  /* removePerson */

  /**
   * NAME: getSuggestedRelations
   *
   * SYNOPSIS: static getSuggestedRelations(originId: string, relation: "children" | "partners" | "parents") => Promise<{ firstSuggestions: TreeMember[], otherSuggestions: TreeMember[] }>
   *    originId  --> The id of the person to get suggestions for.
   *    relation  --> The relationship type to get suggestions for.
   *
   * DESCRIPTION
   * This function takes in the id of a person and a relationship type and retrieves suggestions
   * for people to connect to the person. The function will return the suggestions.
   *
   * RETURNS
   * A promise containing the suggestions for people to connect to the person. Suggestions are
   * grouped into firstSuggestions and otherSuggestions, with the firstSuggestions being the top
   * suggestions.
   */
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
  /* getSuggestedRelations */

  /**
   * NAME: getPeople
   *
   * SYNOPSIS: static getPeople(treeId: string) => Promise<TreeMember[]>
   *    treeId  --> The id of the tree to get the people for.
   *
   * DESCRIPTION
   * This function takes in the id of a tree and retrieves all the people in the tree. The function
   * will return an array of TreeMember objects that belong to the tree.
   *
   * RETURNS
   * A promise containing an array of TreeMember objects that belong to the tree.
   */
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
  /* getPeople */

  /**
   * NAME: switchRoot
   *
   * SYNOPSIS: static switchRoot(personId: string, isRoot: boolean) => Promise<void>
   *    personId  --> The id of the person to switch the root status for.
   *    isRoot    --> Whether the person is the root of the tree.
   *
   * DESCRIPTION
   * This function takes in the id of a person and a boolean value to switch the root status of the
   * person. The function will return when the root status has been switched.
   *
   * RETURNS
   * A promise that resolves when the root status has been switched.
   */
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
  /* switchRoot */
}
