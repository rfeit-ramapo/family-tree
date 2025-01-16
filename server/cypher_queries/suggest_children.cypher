MATCH (p:Person {id: $id})<-[:CONTAINS]-(t:Tree)

// Match children of partners
OPTIONAL MATCH (p)-[:PARTNER_OF]-(partner:Person)
OPTIONAL MATCH (partner)-[:PARENT_OF]->(partnerChild:Person)
OPTIONAL MATCH (p)-[:PARENT_OF]->(currentChild:Person)
WHERE currentChild.id <> partnerChild.id

// Match all direct relatives to avoid suggesting them
OPTIONAL MATCH (p)<-[:PARENT_OF]-(parent:Person)-[:PARENT_OF]->(sibling:Person)
WHERE sibling.id <> p.id
OPTIONAL MATCH (p)-[:PARENT_OF|PARTNER_OF]-(relative:Person)

WITH p, t, 
    COLLECT(DISTINCT partnerChild) AS partnerChildren, 
    COLLECT(DISTINCT sibling) + COLLECT(DISTINCT relative) AS relatives

// Also match all other tree members
OPTIONAL MATCH (t)-[:CONTAINS]->(treeMember:Person)
WHERE treeMember.id <> p.id AND NOT treeMember IN relatives

RETURN
    p AS person,
    partnerChildren AS firstSuggestions,
    COLLECT(DISTINCT treeMember) AS otherSuggestions