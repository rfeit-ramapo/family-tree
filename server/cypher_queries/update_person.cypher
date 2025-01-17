MATCH (p:Person {id: $id})
SET p.firstName = $firstName,
    p.middleName = $middleName,
    p.lastName = $lastName,
    p.dateOfBirth = $dateOfBirth,
    p.dateOfDeath = $dateOfDeath,
    p.note = $note,
    p.gender = $gender,
    p.location = $location,
    p.imageUrl = $imageUrl
RETURN p