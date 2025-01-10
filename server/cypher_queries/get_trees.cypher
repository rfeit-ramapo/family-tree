MATCH (t:Tree)<-[:OWNS_TREE]-(u:User {id: $id})
RETURN t{.*, creator: u.id} AS tree
