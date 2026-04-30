-- Input:  Common MongoDB aggregation queries
-- Output: Equivalent PostgreSQL SQL queries

-- MongoDB: db.orders.find({status: "shipped", total: {$gte: 100}}).sort({createdAt: -1}).limit(20)
SELECT * FROM orders
WHERE status = 'shipped' AND total >= 100
ORDER BY created_at DESC
LIMIT 20;

-- MongoDB: db.orders.aggregate([{$group: {_id: "$status", count: {$sum: 1}, avg: {$avg: "$total"}}}])
SELECT status, COUNT(*) AS count, AVG(total) AS avg_total
FROM orders
GROUP BY status;

-- MongoDB: db.users.find({"address.city": "New York"})
-- Option A: Normalized (address in separate table)
SELECT u.* FROM users u
JOIN addresses a ON a.user_id = u.id
WHERE a.city = 'New York';

-- Option B: JSONB (address stored in metadata column)
SELECT * FROM users
WHERE metadata->>'city' = 'New York';

-- MongoDB: db.users.find({tags: {$in: ["premium", "vip"]}})
-- Option A: Junction table
SELECT DISTINCT u.* FROM users u
JOIN user_tags ut ON ut.user_id = u.id
JOIN tags t ON t.id = ut.tag_id
WHERE t.name IN ('premium', 'vip');

-- Option B: JSONB array
SELECT * FROM users
WHERE metadata->'tags' ?| ARRAY['premium', 'vip'];

-- MongoDB: db.products.aggregate([
--   {$unwind: "$reviews"},
--   {$group: {_id: "$_id", avgRating: {$avg: "$reviews.rating"}}}
-- ])
-- PostgreSQL with JSONB array:
SELECT id, AVG((review->>'rating')::numeric) AS avg_rating
FROM products, jsonb_array_elements(reviews) AS review
GROUP BY id;

-- MongoDB: db.orders.aggregate([
--   {$lookup: {from: "users", localField: "userId", foreignField: "_id", as: "user"}}
-- ])
SELECT o.*, u.name AS user_name, u.email AS user_email
FROM orders o
JOIN users u ON o.user_id = u.id;
