-- Fix pgmq schema permissions
-- The error shows "permission denied for schema pgmq" 

-- Grant permissions to pgmq schema for all relevant roles
GRANT USAGE ON SCHEMA pgmq TO postgres;
GRANT USAGE ON SCHEMA pgmq TO supabase_admin;
GRANT USAGE ON SCHEMA pgmq TO authenticated;
GRANT USAGE ON SCHEMA pgmq TO service_role;
GRANT USAGE ON SCHEMA pgmq TO anon;
GRANT USAGE ON SCHEMA pgmq TO PUBLIC;

-- Grant execute permissions on all pgmq functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO supabase_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO PUBLIC;

-- Set default privileges for future pgmq functions
ALTER DEFAULT PRIVILEGES IN SCHEMA pgmq GRANT EXECUTE ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA pgmq GRANT EXECUTE ON FUNCTIONS TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA pgmq GRANT EXECUTE ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA pgmq GRANT EXECUTE ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA pgmq GRANT EXECUTE ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA pgmq GRANT EXECUTE ON FUNCTIONS TO PUBLIC;

-- Verify pgmq functions are accessible
SELECT 
  'PGMQ functions available' as info,
  proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'pgmq'
ORDER BY proname; 