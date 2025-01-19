MATCH (p:Person {id: $personId})
DETACH DELETE p;