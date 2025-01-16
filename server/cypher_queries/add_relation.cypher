MATCH (origin:Person {id: $originId})
MATCH (target:Person {id: $targetId})
MERGE (origin)-[r:$relation]->(target)
RETURN r