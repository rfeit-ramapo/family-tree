MATCH (t:Tree {id: $id})
MERGE (p:Person {id: $id})<-[:CONTAINS]-(t)
SET p.firstName = $firstName,
    p.middleName = $middleName,
    p.lastName = $lastName,
    p.dateOfBirth = $dateOfBirth,
    p.dateOfDeath = $dateOfDeath,
    p.note = $note
    p.gender = $gender
    p.location = $location
    p.imageUrl = $imageUrl
RETURN p