MATCH (t:Tree {id: $id})<-[:OWNS_TREE]-(u:User)
OPTIONAL MATCH (editor:User)-[:CAN_EDIT]->(t)
OPTIONAL MATCH (viewer:User)-[:CAN_VIEW]->(t)
OPTIONAL MATCH (t)-[:ROOT]->(p:Person)

// Partner
OPTIONAL MATCH (p)-[:PARTNER_OF {current: true}]-(partner:Person)

// Parents
OPTIONAL MATCH (p)<-[:PARENT_OF]-(parent1:Person)
OPTIONAL MATCH (p)<-[:PARENT_OF]-(parent2:Person)
  WHERE parent1.id <> parent2.id

// Siblings
OPTIONAL MATCH (parent1)-[:PARENT_OF]->(sibling:Person)<-[:PARENT_OF]-(parent2)
  WHERE sibling.id <> p.id
OPTIONAL MATCH (parent1)-[:PARENT_OF]->(halfSiblingP1:Person)
  WHERE NOT (parent2)-[:PARENT_OF]->(halfSiblingP1) AND halfSiblingP1.id <> p.id
OPTIONAL MATCH (parent2)-[:PARENT_OF]->(halfSiblingP2:Person)
  WHERE NOT (parent1)-[:PARENT_OF]->(halfSiblingP2) AND halfSiblingP2.id <> p.id

// Children (and their partners)
OPTIONAL MATCH (p)-[:PARENT_OF]->(partnerChild:Person)<-[:PARENT_OF]-(partner)
OPTIONAL MATCH (p)-[:PARENT_OF]->(soloChild:Person)
  WHERE NOT soloChild = partnerChild

// Return
WITH t, u, partner, parent1, parent2, p AS root, 
  COLLECT(DISTINCT editor.id) AS editors, 
  COLLECT(DISTINCT viewer.id) AS viewers, 
  COLLECT(DISTINCT sibling) AS siblings,
  COLLECT(DISTINCT halfSiblingP1) AS halfSiblingsP1,
  COLLECT(DISTINCT halfSiblingP2) AS halfSiblingsP2,
  COLLECT(DISTINCT partnerChild) AS partnerChildren,
  COLLECT(DISTINCT soloChild) AS soloChildren

RETURN 
  t{.*, creator: u.id, editors, viewers} AS metadata,
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