// Import Nodes and Relationships from canvasUtils
import {
  Node,
  ParentRelationship,
  ParentsRelationship,
  PartnerRelationship,
  Relationship,
  RelationshipType,
} from "./canvasUtils";

export interface Tree {
  creator: string;
  name: string;
  id: string;
  dateCreated: Date;
  lastModified: Date;
  isPublic: boolean;
  editors: string[];
  viewers: string[];
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

export interface TreeWithMembers {
  metadata: Tree;
  focal?: TreeMember;
  root?: TreeMember;
  partner?: TreeMember;
  parent1?: TreeMember;
  parent2?: TreeMember;
  siblings?: TreeMember[];
  halfSiblingsP1?: TreeMember[];
  halfSiblingsP2?: TreeMember[];
  partnerChildren?: TreeMember[];
  soloChildren?: TreeMember[];
}

// Convert a tree into a list of nodes and relationships
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

  // Return parent1 as they are the root node (all other nodes can be drawn from here)
  return parent1 || focalPoint;
};

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
