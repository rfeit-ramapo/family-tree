MATCH (t:Tree {id: $id})
OPTIONAL MATCH (t)-[:CONTAINS]->(p:Person)
DETACH DELETE t, p