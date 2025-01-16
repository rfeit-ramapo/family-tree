MATCH (p:Person {id: $id})<-[:CONTAINS]-(t:Tree)

// Match parents of children
OPTIONAL MATCH (p)-[:PARENT_OF]->(child:Person)
OPTIONAL MATCH (existingPartner:Person)-[:PARTNER_OF]-(p)
OPTIONAL MATCH (childParent)-[:PARENT_OF]->(child)
WHERE childParent.id <> p.id AND NOT childParent = existingPartner

// Match all direct relatives to avoid suggesting them
OPTIONAL MATCH (p)<-[:PARENT_OF]-(parent:Person)-[:PARENT_OF]->(sibling:Person)
WHERE sibling.id <> p.id
OPTIONAL MATCH (p)-[:PARENT_OF|PARTNER_OF]-(relative:Person)

WITH p, t, 
    COLLECT(DISTINCT childParent) AS childParents, 
    COLLECT(DISTINCT sibling) + COLLECT(DISTINCT relative) AS relatives

// Also match all other tree members
OPTIONAL MATCH (t)-[:CONTAINS]->(treeMember:Person)
WHERE treeMember.id <> p.id AND NOT treeMember IN relatives

RETURN
    p AS person,
    childParents AS firstSuggestions,
    COLLECT(DISTINCT treeMember) AS otherSuggestions