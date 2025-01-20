/**
 * File providing logic for converting a tree into a list of nodes and relationships.
 */

import {
  Node,
  ParentRelationship,
  ParentsRelationship,
  PartnerRelationship,
  Relationship,
  RelationshipType,
} from "./canvasUtils";

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
  // The date the tree was created
  dateCreated: Date;
  // The date the tree was last modified
  lastModified: Date;
  // Whether the tree is public or private
  isPublic: boolean;
  // The list of editors for the tree
  editors: string[];
  // The list of viewers for the tree
  viewers: string[];
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
 * Interface for a tree with members object.
 * Holds a tree object and its members, along with the initial
 * relationships to be rendered.
 */
export interface TreeWithMembers {
  // The metadata of the tree
  metadata: Tree;
  // The focal point that the tree is centered around
  focal?: TreeMember;
  // The root of the tree (may or may not be the current focal point)
  root?: TreeMember;
  // The partner of the focal point
  partner?: TreeMember;
  // The first parent of the focal point
  parent1?: TreeMember;
  // The second parent of the focal point
  parent2?: TreeMember;
  // The siblings of the focal point
  siblings?: TreeMember[];
  // The half-siblings of the focal point from parent 1
  halfSiblingsP1?: TreeMember[];
  // The half-siblings of the focal point from parent 2
  halfSiblingsP2?: TreeMember[];
  // The children the focal point shares with their current partner
  partnerChildren?: TreeMember[];
  // The children the focal point has separate from the partner
  soloChildren?: TreeMember[];
}

/**
 * NAME: treeToNodes
 *
 * SYNOPSIS: treeToNodes(tree: TreeWithMembers) => Node | undefined
 *    tree  --> the tree with members to conver to nodes and relationships
 *
 * DESCRIPTION: Function to convert a tree object with members into a list of nodes
 *   and relationships that can be rendered on a canvas.
 *
 * RETURNS: A Node object representing the top left of the tree, or undefined if the tree has
 *  no focal point.
 */
export const treeToNodes = (tree: TreeWithMembers) => {
  if (!tree.focal) return;

  // Convert all members to nodes
  const focalPoint = memberToNode(tree.focal, false);
  focalPoint.isFocalPoint = true;
  const partner = tree.partner ? memberToNode(tree.partner, true) : null;
  const parent1 = tree.parent1 ? memberToNode(tree.parent1, false) : null;
  const parent2 = tree.parent2 ? memberToNode(tree.parent2, true) : null;

  const siblings = tree.siblings
    ? tree.siblings.map((sibling) => memberToNode(sibling, false))
    : [];
  const halfSiblingsP1 = tree.halfSiblingsP1
    ? tree.halfSiblingsP1.map((sibling) => memberToNode(sibling, false))
    : [];
  const halfSiblingsP2 = tree.halfSiblingsP2
    ? tree.halfSiblingsP2.map((sibling) => memberToNode(sibling, false))
    : [];
  const partnerChildren = tree.partnerChildren
    ? tree.partnerChildren.map((child) => memberToNode(child, false))
    : [];
  const soloChildren = tree.soloChildren
    ? tree.soloChildren.map((child) => memberToNode(child, false))
    : [];

  // Partner
  const partnership = partner
    ? (nodesToRelationship(
        focalPoint,
        partner,
        RelationshipType.PARTNER
      ) as PartnerRelationship)
    : null;

  // Parents to each other
  const parentsPartnership =
    parent1 && parent2
      ? (nodesToRelationship(
          parent1,
          parent2,
          RelationshipType.PARTNER
        ) as PartnerRelationship)
      : null;

  // Parent(s) to focal point
  if (parentsPartnership) {
    parentsPartnership.childRelationships.push(
      nodesToRelationship(
        parent1!,
        parent2!,
        RelationshipType.PARENT,
        focalPoint
      )
    );
  } else if (parent1) {
    parent1.childRelationships.push(
      nodesToRelationship(parent1, focalPoint, RelationshipType.PARENT)
    );
  }

  // Parent(s) to siblings
  if (siblings.length) {
    siblings.forEach((sibling) =>
      parentsPartnership!.childRelationships.push(
        nodesToRelationship(
          parent1!,
          parent2!,
          RelationshipType.PARENT,
          sibling
        )
      )
    );
  }
  if (halfSiblingsP1.length) {
    halfSiblingsP1.forEach((sibling) =>
      parent1?.childRelationships.push(
        nodesToRelationship(parent1!, sibling, RelationshipType.PARENT)
      )
    );
  }
  if (halfSiblingsP2.length) {
    halfSiblingsP2.forEach((sibling) =>
      parent2?.childRelationships.push(
        nodesToRelationship(parent2!, sibling, RelationshipType.PARENT)
      )
    );
  }

  // Focal point to child(ren)
  if (partnerChildren.length) {
    partnerChildren.forEach((child) =>
      partnership!.childRelationships.push(
        nodesToRelationship(
          focalPoint,
          partner!,
          RelationshipType.PARENT,
          child
        )
      )
    );
  }
  if (soloChildren.length) {
    soloChildren.forEach((child) =>
      focalPoint.childRelationships.push(
        nodesToRelationship(focalPoint, child, RelationshipType.PARENT)
      )
    );
  }

  // Return parent1 as they are the node from which all others can be drawn
  return parent1 || focalPoint;
};
/* treeToNodes */

/**
 * NAME: memberToNode
 *
 * SYNOPSIS: memberToNode(member: TreeMember, isPartner: boolean) => Node
 *    member  --> the member to convert to a node
 *    isPartner  --> whether the member is the second partner in a pair
 *
 * DESCRIPTION: Function to convert a tree member object into a node object.
 *
 * RETURNS: A Node object representing the member.
 */
export const memberToNode = (member: TreeMember, isPartner: boolean) => {
  // Calculate the display name
  let displayName = "";
  if (member.firstName) displayName += member.firstName;
  if (displayName.length) displayName += " ";
  if (member.lastName) displayName += member.lastName;

  // Create the node
  return new Node(
    member.id,
    displayName,
    isPartner,
    member.imageUrl,
    member.gender
  );
};
/* memberToNode */

/**
 * NAME: nodesToRelationship
 *
 * SYNOPSIS: nodesToRelationship(member1: Node, member2: Node, relType: RelationshipType, member3?: Node) => Relationship
 *    member1  --> the first member in the relationship
 *    member2  --> the second member in the relationship
 *    relType  --> the type of relationship to create
 *    member3  --> an optional third member in the relationship
 *
 * DESCRIPTION: Function to create a relationship out of two or three nodes.
 *
 * RETURNS: A Relationship object representing the relationship between the nodes.
 */
const nodesToRelationship = (
  member1: Node,
  member2: Node,
  relType: RelationshipType,
  member3?: Node
) => {
  // Create a relationship id by combining member ids
  let relId = member1.id + member2.id;
  if (member3) relId += member3.id;
  let relationship: Relationship;

  if (relType === RelationshipType.PARENT) {
    // Multiple parents; create a new ParentsRelationship
    if (member3) {
      const displayName =
        member3.gender === "female"
          ? "daughter"
          : member3.gender === "male"
            ? "son"
            : "child";
      relationship = new ParentsRelationship(
        relId,
        displayName,
        [member1, member2],
        member3
      );
      member1.parentRelationships.push(relationship);
      member2.parentRelationships.push(relationship);
    }

    // Single parent; create a new ParentRelationship
    else {
      const displayName =
        member2.gender === "female"
          ? "daughter"
          : member2.gender === "male"
            ? "son"
            : "child";
      relationship = new ParentRelationship(
        relId,
        displayName,
        member1,
        member2
      );
      member1.parentRelationships.push(relationship);
    }
  }
  // Partner relationship
  else {
    relationship = new PartnerRelationship(
      relId,
      "partnered",
      member1,
      member2
    );
    member1.partnerRelationship = relationship as PartnerRelationship;
  }

  return relationship;
};
/* nodesToRelationship */
