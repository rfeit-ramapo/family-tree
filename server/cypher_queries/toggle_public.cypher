// Ensure that the tree is owned by the user before toggling the public status
MATCH (t:Tree {id: $id})<-[:OWNS_TREE]-(u:User {id: $userId})
SET t.isPublic = NOT coalesce(t.isPublic, false)