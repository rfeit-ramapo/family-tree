MATCH (t:Tree {id: $id})
OPTIONAL MATCH (t)-[:CONTAINS]->(p:Person)
RETURN COLLECT(DISTINCT p) AS people