-- Function to sync schema changes from Prisma
CREATE OR REPLACE FUNCTION public.sync_schema_from_prisma()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create the audit log table if it doesn't exist
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL
  );

  -- Record this sync attempt
  INSERT INTO schema_migrations (migration_name, status)
  VALUES ('sync_from_prisma_' || to_char(now(), 'YYYY_MM_DD_HH24_MI_SS'), 'started');

  -- Add function to create missing columns
  CREATE OR REPLACE FUNCTION add_column_if_not_exists(
    _table text, 
    _column text, 
    _type text
  ) RETURNS boolean AS $$
  DECLARE
    _schema text := 'public';
    _exists boolean;
  BEGIN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = _schema
        AND table_name = _table
        AND column_name = _column
    ) INTO _exists;

    IF NOT _exists THEN
      EXECUTE format('ALTER TABLE %I.%I ADD COLUMN %I %s', _schema, _table, _column, _type);
      RETURN true;
    END IF;
    RETURN false;
  END;
  $$ LANGUAGE plpgsql;

  -- Record successful completion
  UPDATE schema_migrations 
  SET status = 'completed' 
  WHERE migration_name = (
    SELECT migration_name 
    FROM schema_migrations 
    ORDER BY id DESC 
    LIMIT 1
  );

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  -- Record failure
  UPDATE schema_migrations 
  SET status = 'failed: ' || SQLERRM 
  WHERE migration_name = (
    SELECT migration_name 
    FROM schema_migrations 
    ORDER BY id DESC 
    LIMIT 1
  );
  
  RAISE;
END;
$$;

-- Function to track changes for syncing back to Prisma
CREATE OR REPLACE FUNCTION public.track_db_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create tracking table if it doesn't exist
  CREATE TABLE IF NOT EXISTS db_changes (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    synced_to_prisma BOOLEAN DEFAULT FALSE
  );
  
  -- Insert the change record
  INSERT INTO db_changes (table_name, record_id, operation)
  VALUES (TG_TABLE_NAME, NEW.id, TG_OP);
  
  RETURN NEW;
END;
$$;

-- Example trigger for a table (you'd need to create this for each table)
-- CREATE TRIGGER track_users_changes
-- AFTER INSERT OR UPDATE OR DELETE ON users
-- FOR EACH ROW EXECUTE FUNCTION track_db_changes(); 