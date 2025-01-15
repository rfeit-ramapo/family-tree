MATCH (t:Tree)<-[:OWNS_TREE]-(u:User {id: $id})
OPTIONAL MATCH (editor:User)-[:CAN_EDIT]->(t)
OPTIONAL MATCH (viewer:User)-[:CAN_VIEW]->(t)
WITH t, u, COLLECT(DISTINCT editor.id) AS editors, COLLECT(DISTINCT viewer.id) AS viewers
RETURN t{.*, creator: u.id, editors, viewers} AS tree
