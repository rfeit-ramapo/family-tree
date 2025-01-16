MATCH (p:Person {id: $id})<-[:CONTAINS]-(t:Tree)
MATCH (t)<-[:OWNS_TREE]-(u:User)
OPTIONAL MATCH (viewer:User)-[:CAN_VIEW]->(t)

OPTIONAL MATCH (r:Person {id: $rootId})
WITH p, r, (p = r) AS isRoot
OPTIONAL MATCH relationPath=shortestPath((r)-[:PARENT_OF|PARTNER_OF*1..]-(p))
WHERE NOT isRoot

OPTIONAL MATCH (p)<-[:PARENT_OF]-(parent:Person)
OPTIONAL MATCH (p)-[:PARTNER_OF {current: true}]-(currentPartner:Person)
OPTIONAL MATCH (p)-[:PARTNER_OF]-(partner:Person)
WHERE currentPartner.id <> partner.id
OPTIONAL MATCH (p)-[:PARENT_OF]->(child:Person)

RETURN 
  p AS person, 
  CASE WHEN isRoot THEN NULL ELSE relationPath END AS relationPath, 
  COLLECT(parent) AS parents, 
  currentPartner, 
  COLLECT(partner) AS partners, 
  COLLECT(child) AS children, 
  isRoot
  t.isPublic AS isPublic
  u.id AS creator
  COLLECT(DISTINCT viewer.id) AS viewers
LIMIT 1