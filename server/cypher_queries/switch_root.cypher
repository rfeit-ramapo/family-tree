MATCH (p:Person {id: $id})<-[:CONTAINS]-(t:Tree)
OPTIONAL MATCH (curRoot:Person)<-[r:ROOT]-(t)
DELETE r
MERGE (p)<-[:ROOT]-(t)
