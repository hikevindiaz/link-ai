-- Fix permissions for util schema so file creation triggers work
-- The error shows "permission denied for schema util" when creating file records

-- Check current permissions
SELECT 
  'Current util schema permissions' as info,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.schema_privileges 
WHERE schema_name = 'util';

-- Check what roles exist
SELECT 
  'Available roles' as info,
  rolname as role_name,
  rolsuper as is_superuser,
  rolcreaterole as can_create_roles,
  rolcreatedb as can_create_db
FROM pg_roles 
WHERE rolname IN ('postgres', 'supabase_admin', 'authenticated', 'anon', 'service_role')
ORDER BY rolname;

-- Grant usage permissions on util schema to authenticated users
GRANT USAGE ON SCHEMA util TO authenticated;
GRANT USAGE ON SCHEMA util TO service_role;
GRANT USAGE ON SCHEMA util TO anon;

-- Grant execute permissions on util functions to authenticated users
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA util TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA util TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA util TO anon;

-- Set default privileges for future functions in util schema
ALTER DEFAULT PRIVILEGES IN SCHEMA util GRANT EXECUTE ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA util GRANT EXECUTE ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA util GRANT EXECUTE ON FUNCTIONS TO anon;

-- Verify the permissions were granted
SELECT 
  'Updated util schema permissions' as info,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.schema_privileges 
WHERE schema_name = 'util'
ORDER BY grantee, privilege_type;

-- Check function permissions specifically
SELECT 
  'Function permissions in util schema' as info,
  p.proname as function_name,
  array_agg(DISTINCT a.rolname) as granted_to_roles
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_proc_acl pa ON p.oid = pa.objoid
LEFT JOIN pg_authid a ON pa.grantee = a.oid
WHERE n.nspname = 'util'
GROUP BY p.proname
ORDER BY p.proname; 