MATCH (t:Tree {id: $id})<-[:OWNS_TREE]-(u:User)
OPTIONAL MATCH (editor:User)-[:CAN_EDIT]->(t)
OPTIONAL MATCH (viewer:User)-[:CAN_VIEW]->(t)

// Change behavior based on whether a focal person is specified
OPTIONAL MATCH (t)-[:CONTAINS]->(focal:Person {id: $focalId})
OPTIONAL MATCH (t)-[:ROOT]->(root:Person)
WITH t, u, 
  COLLECT(DISTINCT editor) AS editors, 
  COLLECT(DISTINCT viewer) AS viewers, 
  root,
  CASE WHEN focal IS NOT NULL THEN focal ELSE root END AS focal
// Match a random person if no focal or root is specified
OPTIONAL MATCH (t)-[:CONTAINS]->(p:Person)
WITH t, u, editors, viewers, root,
  CASE WHEN focal IS NOT NULL THEN focal ELSE p END AS focal

// Partner
OPTIONAL MATCH (focal)-[:PARTNER_OF {current: true}]-(partner:Person)

// Parents
OPTIONAL MATCH (focal)<-[:PARENT_OF]-(parent1:Person)
OPTIONAL MATCH (focal)<-[:PARENT_OF]-(parent2:Person)
  WHERE parent1.id <> parent2.id

// Siblings
OPTIONAL MATCH (parent1)-[:PARENT_OF]->(sibling:Person)<-[:PARENT_OF]-(parent2)
  WHERE sibling.id <> focal.id
OPTIONAL MATCH (parent1)-[:PARENT_OF]->(halfSiblingP1:Person)
  WHERE NOT (parent2)-[:PARENT_OF]->(halfSiblingP1) AND halfSiblingP1.id <> focal.id
OPTIONAL MATCH (parent2)-[:PARENT_OF]->(halfSiblingP2:Person)
  WHERE NOT (parent1)-[:PARENT_OF]->(halfSiblingP2) AND halfSiblingP2.id <> focal.id

// Children (and their partners)
OPTIONAL MATCH (focal)-[:PARENT_OF]->(partnerChild:Person)<-[:PARENT_OF]-(partner)
WITH t, u, partner, parent1, parent2, focal, root, editors, viewers,
  COLLECT(DISTINCT sibling) AS siblings,
  COLLECT(DISTINCT halfSiblingP1) AS halfSiblingsP1,
  COLLECT(DISTINCT halfSiblingP2) AS halfSiblingsP2,
  COLLECT(DISTINCT partnerChild) AS partnerChildren
OPTIONAL MATCH (focal)-[:PARENT_OF]->(soloChild:Person)
  WHERE NOT soloChild IN partnerChildren

// Return
WITH t, u, partner, parent1, parent2, focal, root, editors, viewers, siblings, halfSiblingsP1, halfSiblingsP2, partnerChildren, COLLECT(DISTINCT soloChild) AS soloChildren

RETURN 
  t{.*, creator: u.id, editors, viewers} AS metadata,
  focal,
  root,
  partner,
  parent1,
  parent2,
  siblings,
  halfSiblingsP1,
  halfSiblingsP2,
  partnerChildren,
  soloChildren
LIMIT 1