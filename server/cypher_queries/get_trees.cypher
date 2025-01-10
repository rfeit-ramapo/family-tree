MATCH (t:Tree)<-[:CREATED]-(u:User {id: $id})
RETURN t{.*, creator: u.id} AS tree
