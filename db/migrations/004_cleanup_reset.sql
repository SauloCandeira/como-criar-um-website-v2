-- Cleanup: remove inconsistent users (purchases without valid cloned project)
WITH invalid_users AS (
  SELECT DISTINCT pu.user_id
  FROM purchases pu
  LEFT JOIN projects p
    ON p.id = pu.project_id
   AND p.created_from_purchase = true
   AND p.is_template = false
   AND p.owner_user_id = pu.user_id
   AND p.product_id = pu.product_id
   AND p.purchase_id = pu.id
  WHERE pu.status = 'completed'
    AND p.id IS NULL
)
DELETE FROM purchases pu
USING invalid_users iu
WHERE pu.user_id = iu.user_id;

WITH invalid_users AS (
  SELECT DISTINCT pu.user_id
  FROM purchases pu
  LEFT JOIN projects p
    ON p.id = pu.project_id
   AND p.created_from_purchase = true
   AND p.is_template = false
   AND p.owner_user_id = pu.user_id
   AND p.product_id = pu.product_id
   AND p.purchase_id = pu.id
  WHERE pu.status = 'completed'
    AND p.id IS NULL
)
DELETE FROM projects p
USING invalid_users iu
WHERE p.owner_user_id = iu.user_id
  AND p.created_from_purchase = true
  AND p.is_template = false;

-- Self-healing: cancel duplicate purchases (keep most recent)
WITH ranked_purchases AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id, product_id ORDER BY created_at DESC) AS rn
  FROM purchases
  WHERE status = 'completed'
)
UPDATE purchases pu
SET status = 'canceled'
FROM ranked_purchases rp
WHERE pu.id = rp.id
  AND rp.rn > 1;

-- Self-healing: remove duplicate clones (keep most recent)
WITH ranked_clones AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY owner_user_id, base_project_id ORDER BY created_at DESC) AS rn
  FROM projects
  WHERE created_from_purchase = true
    AND is_template = false
    AND base_project_id IS NOT NULL
)
DELETE FROM projects p
USING ranked_clones rc
WHERE p.id = rc.id
  AND rc.rn > 1;

-- Self-healing: remove duplicate owner/product projects (keep most recent)
WITH ranked_owner_products AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY owner_user_id, product_id ORDER BY created_at DESC) AS rn
  FROM projects
  WHERE owner_user_id <> ''
    AND product_id IS NOT NULL
)
DELETE FROM projects p
USING ranked_owner_products rop
WHERE p.id = rop.id
  AND rop.rn > 1;

-- Self-healing: remove clones without valid purchase
DELETE FROM projects p
WHERE p.created_from_purchase = true
  AND p.is_template = false
  AND (p.purchase_id IS NULL OR NOT EXISTS (SELECT 1 FROM purchases pu WHERE pu.id = p.purchase_id AND pu.status = 'completed'));

-- Re-link purchases and projects after cleanup
UPDATE purchases pu
SET project_id = p.id
FROM projects p
WHERE pu.status = 'completed'
  AND pu.project_id IS NULL
  AND p.owner_user_id = pu.user_id
  AND p.product_id = pu.product_id
  AND p.created_from_purchase = true
  AND p.is_template = false;

UPDATE projects p
SET purchase_id = pu.id
FROM purchases pu
WHERE p.created_from_purchase = true
  AND p.is_template = false
  AND p.purchase_id IS NULL
  AND pu.project_id = p.id
  AND pu.status = 'completed';

-- Reset purchases and cloned projects to start a fresh purchase flow
DELETE FROM purchases;
DELETE FROM projects WHERE created_from_purchase = true AND is_template = false;
UPDATE projects SET purchase_id = NULL, product_id = NULL, created_from_purchase = false WHERE purchase_id IS NOT NULL;

-- Final cleanup: enforce single project per owner/product before unique index
WITH ranked_owner_products_final AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY owner_user_id, product_id ORDER BY created_at DESC) AS rn
  FROM projects
  WHERE owner_user_id <> ''
    AND product_id IS NOT NULL
    AND is_template = false
)
DELETE FROM projects p
USING ranked_owner_products_final rop
WHERE p.id = rop.id
  AND rop.rn > 1;
