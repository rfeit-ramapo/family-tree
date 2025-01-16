MATCH (p1:Person {id: $originId})-[r]-(p2:Person {id: $targetId})
DELETE r