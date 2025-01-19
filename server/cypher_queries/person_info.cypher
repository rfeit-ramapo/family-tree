MATCH (p:Person {id: $id})<-[:CONTAINS]-(t:Tree)
MATCH (t)<-[:OWNS_TREE]-(u:User)
OPTIONAL MATCH (viewer:User)-[:CAN_VIEW]->(t)
OPTIONAL MATCH (editor:User)-[:CAN_EDIT]->(t)

OPTIONAL MATCH (r:Person)<-[:ROOT]-(t)
WITH p, r, (p = r) AS isRoot, t, u, viewer, editor
OPTIONAL MATCH relationPath=shortestPath((r)-[:PARENT_OF|PARTNER_OF*1..]-(p))
WHERE NOT isRoot

OPTIONAL MATCH (p)<-[:PARENT_OF]-(parent:Person)
OPTIONAL MATCH (p)-[:PARTNER_OF {current: true}]-(currentPartner:Person)
OPTIONAL MATCH (p)-[:PARTNER_OF]-(partner:Person)
OPTIONAL MATCH (p)-[:PARENT_OF]->(child:Person)

RETURN 
  p AS person, 
  relationPath,
  COLLECT(DISTINCT parent) AS parents, 
  currentPartner, 
  COLLECT(DISTINCT partner) AS partners, 
  COLLECT(DISTINCT child) AS children, 
  isRoot,
  t.isPublic AS isPublic,
  u.id AS creator,
  COLLECT(DISTINCT viewer.id) AS viewers,
  COLLECT(DISTINCT editor.id) AS editors
LIMIT 1