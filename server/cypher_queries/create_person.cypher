MATCH (t:Tree {id: $treeId})
MERGE (p:Person {id: $id})<-[:CONTAINS]-(t)
RETURN p