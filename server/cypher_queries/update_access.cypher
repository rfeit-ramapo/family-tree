MATCH (t:Tree {id: $treeId})
SET t.lastAccessed = datetime()