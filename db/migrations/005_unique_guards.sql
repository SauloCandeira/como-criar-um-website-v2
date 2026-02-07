DROP INDEX IF EXISTS purchases_user_product_active_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS purchases_user_product_active_uidx ON purchases (user_id, product_id) WHERE status = 'completed';

DROP INDEX IF EXISTS projects_owner_base_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS projects_owner_base_uidx ON projects (owner_user_id, base_project_id) WHERE created_from_purchase = true;

DROP INDEX IF EXISTS projects_owner_product_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS projects_owner_product_uidx ON projects (owner_user_id, product_id) WHERE owner_user_id <> '' AND product_id IS NOT NULL AND is_template = false;
