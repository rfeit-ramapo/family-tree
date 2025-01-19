MATCH (p1 {id: $p1Id})-[r:PARTNER_OF]-(p2 {id: $p2Id})
OPTIONAL MATCH (p1)-[rp1:PARTNER_OF]-(ap1:Person)
WHERE ap1.id <> p2.id
OPTIONAL MATCH (p2)-[rp2:PARTNER_OF]-(ap2:Person)
WHERE ap2.id <> p1.id
SET rp1.current = false, rp2.current = false, r.current = NOT coalesce(r.current, false)