MERGE (u:User {id: $creator})
MERGE (t:Tree {name: $name})
ON CREATE
SET t.id = $id, t.dateCreated = datetime()
MERGE (t)<-[:OWNS_TREE]-(u)
RETURN t{.*} AS tree