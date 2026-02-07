DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_product_type_fkey'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_product_type_fkey
      FOREIGN KEY (product_type) REFERENCES product_types(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_base_project_id_fkey'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_base_project_id_fkey
      FOREIGN KEY (base_project_id) REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_product_id_fkey'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_base_project_id_fkey'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_base_project_id_fkey
      FOREIGN KEY (base_project_id) REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_purchase_id_fkey'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_purchase_id_fkey
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchases_product_id_fkey'
  ) THEN
    ALTER TABLE purchases
      ADD CONSTRAINT purchases_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchases_project_id_fkey'
  ) THEN
    ALTER TABLE purchases
      ADD CONSTRAINT purchases_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS projects_product_id_idx ON projects (product_id);
CREATE INDEX IF NOT EXISTS projects_owner_user_id_idx ON projects (owner_user_id);
CREATE INDEX IF NOT EXISTS projects_base_project_id_idx ON projects (base_project_id);
CREATE INDEX IF NOT EXISTS projects_is_template_idx ON projects (is_template);
CREATE INDEX IF NOT EXISTS projects_purchase_id_idx ON projects (purchase_id);

CREATE INDEX IF NOT EXISTS purchases_user_id_idx ON purchases (user_id);
CREATE INDEX IF NOT EXISTS purchases_product_id_idx ON purchases (product_id);
CREATE INDEX IF NOT EXISTS purchases_project_id_idx ON purchases (project_id);

CREATE INDEX IF NOT EXISTS dao_proposals_status_idx ON dao_proposals (status);
CREATE INDEX IF NOT EXISTS dao_proposals_created_at_idx ON dao_proposals (created_at DESC);
CREATE INDEX IF NOT EXISTS dao_votes_proposal_idx ON dao_votes (proposal_id);
CREATE INDEX IF NOT EXISTS dao_votes_user_idx ON dao_votes (user_id);
CREATE INDEX IF NOT EXISTS dao_mybot_balances_user_idx ON dao_mybot_balances (user_id);
