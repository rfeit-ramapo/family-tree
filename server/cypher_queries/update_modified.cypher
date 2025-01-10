MATCH (t:Tree {id: $treeId})
SET t.lastModified = datetime()