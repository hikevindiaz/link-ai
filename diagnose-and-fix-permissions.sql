-- Comprehensive permission diagnosis and fix
-- The permission error is still occurring, so we need to check what role is actually being used

-- Check what roles exist in the database
SELECT 
  'Available database roles' as info,
  rolname as role_name,
  rolsuper as is_superuser,
  rolcanlogin as can_login
FROM pg_roles 
ORDER BY rolname;

-- Check current user/role
SELECT 
  'Current connection info' as info,
  current_user as current_user,
  session_user as session_user,
  current_database() as current_database;

-- Check existing permissions on util schema
SELECT 
  'Current util schema permissions' as info,
  n.nspname as schema_name,
  r.rolname as role_name,
  p.privilege_type
FROM pg_namespace n
CROSS JOIN pg_roles r
LEFT JOIN (
  SELECT 
    grantee,
    'USAGE' as privilege_type
  FROM information_schema.usage_privileges 
  WHERE object_name = 'util' AND object_type = 'SCHEMA'
  UNION ALL
  SELECT 
    grantee,
    'EXECUTE' as privilege_type  
  FROM information_schema.routine_privileges
  WHERE routine_schema = 'util'
) p ON r.rolname = p.grantee
WHERE n.nspname = 'util' 
AND r.rolname IN ('postgres', 'supabase_admin', 'authenticated', 'anon', 'service_role', 'supabase_auth_admin')
ORDER BY r.rolname, p.privilege_type;

-- Grant permissions to ALL possible roles that might be used
-- This is a comprehensive fix to ensure the permissions work

-- Core Supabase roles
GRANT USAGE ON SCHEMA util TO postgres;
GRANT USAGE ON SCHEMA util TO supabase_admin;
GRANT USAGE ON SCHEMA util TO authenticated;
GRANT USAGE ON SCHEMA util TO service_role;
GRANT USAGE ON SCHEMA util TO anon;

-- Grant execute permissions on all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA util TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA util TO supabase_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA util TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA util TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA util TO anon;

-- Try granting to supabase_auth_admin if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT USAGE ON SCHEMA util TO supabase_auth_admin;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA util TO supabase_auth_admin;
  END IF;
END $$;

-- Set default privileges for future functions
ALTER DEFAULT PRIVILEGES IN SCHEMA util GRANT EXECUTE ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA util GRANT EXECUTE ON FUNCTIONS TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA util GRANT EXECUTE ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA util GRANT EXECUTE ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA util GRANT EXECUTE ON FUNCTIONS TO anon;

-- Also try granting to PUBLIC (this is more permissive but should work)
GRANT USAGE ON SCHEMA util TO PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA util TO PUBLIC;

-- Verify permissions were granted
SELECT 
  'Final verification' as info,
  schemaname,
  objectname,
  grantee,
  privilege_type
FROM (
  SELECT 
    'util' as schemaname,
    'schema' as objectname,
    grantee,
    'USAGE' as privilege_type
  FROM information_schema.usage_privileges 
  WHERE object_name = 'util' AND object_type = 'SCHEMA'
  UNION ALL
  SELECT 
    routine_schema as schemaname,
    routine_name as objectname,
    grantee,
    'EXECUTE' as privilege_type  
  FROM information_schema.routine_privileges
  WHERE routine_schema = 'util'
) perms
ORDER BY grantee, privilege_type; 