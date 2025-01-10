MERGE (u:User {id: $userId})
MERGE (t:Tree {name: $name})
ON CREATE
SET t.id = apoc.create.uuid(),  // Assign a random UUID
    t.dateCreated = datetime()
MERGE (t)<-[:OWNS_TREE]-(u)
RETURN t{.*} AS tree