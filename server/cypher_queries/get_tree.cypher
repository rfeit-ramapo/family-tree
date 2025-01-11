MATCH (t:Tree {id: $id})<-[:OWNS_TREE]-(u:User)
OPTIONAL MATCH (t)-[:FOCAL_POINT]->(p:Person)
RETURN t{.*, creator: u.id, focalPoint: p} AS tree
