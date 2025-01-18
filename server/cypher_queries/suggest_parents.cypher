MATCH (p:Person {id: $id})<-[:CONTAINS]-(t:Tree)

// Match partners of parents and parents of siblings
OPTIONAL MATCH (p)<-[:PARENT_OF]-(currentParent:Person)
OPTIONAL MATCH (currentParent)-[:PARENT_OF]->(sibling:Person)<-[:PARENT_OF]-(siblingParent:Person)
WHERE sibling.id <> p.id AND siblingParent.id <> currentParent.id
OPTIONAL MATCH (currentParent)-[:PARTNER_OF]-(partnerOfParent:Person)

// Match all direct relatives to avoid suggesting them
OPTIONAL MATCH (p)-[:PARENT_OF|PARTNER_OF]-(relative:Person)

WITH p, t, 
    COLLECT(DISTINCT siblingParent) AS siblingParents, 
    COLLECT(DISTINCT partnerOfParent) AS partnersOfParent, 
    COLLECT(DISTINCT sibling) + COLLECT(DISTINCT relative) AS relatives

// Also match all other tree members
OPTIONAL MATCH (t)-[:CONTAINS]->(treeMember:Person)
WHERE treeMember.id <> p.id AND NOT treeMember IN relatives

RETURN
    siblingParents + partnersOfParent AS firstSuggestions,
    COLLECT(DISTINCT treeMember) AS otherSuggestions