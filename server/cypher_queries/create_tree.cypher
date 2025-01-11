MERGE (u:User {id: $creator})
MERGE (t:Tree {name: $name, id: $id})
ON CREATE
SET t.dateCreated = datetime()
MERGE (t)<-[:OWNS_TREE]-(u)
RETURN t{.*, creator: u.id} AS tree