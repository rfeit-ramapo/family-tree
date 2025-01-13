MATCH (t:Tree {id: $id})<-[:OWNS_TREE]-(u:User)
OPTIONAL MATCH (t)-[:FOCAL_POINT]->(p:Person)

// Partner
OPTIONAL MATCH (p)-[:PARTNER_OF {current: true}]-(partner:Person)

// Parents
OPTIONAL MATCH (p)<-[:PARENT_OF]-(parent1:Person)
OPTIONAL MATCH (p)<-[:PARENT_OF]-(parent2:Person)
  WHERE parent1.id IS NOT NULL AND parent2.id IS NOT NULL AND parent1.id <> parent2.id

// Siblings
OPTIONAL MATCH (parent1)-[:PARENT_OF]->(sibling:Person)<-[:PARENT_OF]-(parent2)
  WHERE sibling.id IS NOT NULL AND sibling.id <> p.id
OPTIONAL MATCH (parent1)-[:PARENT_OF]->(halfSiblingP1:Person)
  WHERE NOT (parent2)-[:PARENT_OF]->(halfSiblingP1) AND halfSiblingP1.id <> p.id
OPTIONAL MATCH (parent2)-[:PARENT_OF]->(halfSiblingP2:Person)
  WHERE NOT (parent1)-[:PARENT_OF]->(halfSiblingP2) AND halfSiblingP2.id <> p.id

// Children (and their partners)
OPTIONAL MATCH (p)-[:PARENT_OF]->(partnerChild:Person)
  WHERE EXISTS { MATCH (partnerChild)<-[:PARENT_OF]-(partner:Person) }
OPTIONAL MATCH (p)-[:PARENT_OF]->(soloChild:Person)
  WHERE NOT EXISTS { MATCH (soloChild)<-[:PARENT_OF]-(:Person) }

// Return
RETURN 
  t{.*, creator: u.id} AS tree,
  p AS focalPoint,
  partner,
  parent1,
  parent2,
  COLLECT(DISTINCT sibling) AS siblings,
  COLLECT(DISTINCT halfSiblingP1) AS halfSiblingsP1,
  COLLECT(DISTINCT halfSiblingP2) AS halfSiblingsP2,
  COLLECT(DISTINCT partnerChild) AS partnerChildren,
  COLLECT(DISTINCT soloChild) AS soloChildren
LIMIT 1