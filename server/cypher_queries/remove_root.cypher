MATCH (p:Person {id: $id})<-[r:ROOT]-(t:Tree)
DELETE r