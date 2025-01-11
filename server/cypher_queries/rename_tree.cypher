MATCH (t:Tree {id: $id})
SET t.name = $name
RETURN t{.*} AS tree