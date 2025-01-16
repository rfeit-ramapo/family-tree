MATCH (p1:Person {id: $originId})-[r:PARTNER_OF]-(p2:Person {id: $targetId})
OPTIONAL MATCH (p1)-[rp1:PARTNER_OF {current: true}]->(p1Partner:Person)
OPTIONAL MATCH (p2)-[rp2:PARTNER_OF {current: true}]->(p2Partner:Person)
SET rp1.current = false, rp2.current = false, r.current = true