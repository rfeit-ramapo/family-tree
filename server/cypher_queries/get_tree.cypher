MATCH (t:Tree {id: $id})<-[:OWNS_TREE]-(u:User)
OPTIONAL MATCH (t)-[:CONTAINS]->(p:Person)
OPTIONAL MATCH (p)-[rpartner:PARTNER_OF]-(partner:Person)
OPTIONAL MATCH (p)-[rchild:PARENT_OF]->(child:Person)
OPTIONAL MATCH (p)<-[rparent:PARENT_OF]-(parent:Person)
RETURN t{.*, creator: u.id} AS tree, p AS members, collect(DISTINCT rpartner) AS partners, collect(DISTINCT rparent) AS parents, collect(DISTINCT rchild) AS children