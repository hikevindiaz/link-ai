-- More restrictive permission fix - only authenticated users and service role
-- This excludes anonymous users for extra security

-- Check current permissions
SELECT 
  'Current util schema permissions' as info,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.schema_privileges 
WHERE schema_name = 'util';

-- Grant usage permissions on util schema (excluding anon)
GRANT USAGE ON SCHEMA util TO authenticated;
GRANT USAGE ON SCHEMA util TO service_role;

-- Grant execute permissions on util functions (excluding anon)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA util TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA util TO service_role;

-- Set default privileges for future functions in util schema (excluding anon)
ALTER DEFAULT PRIVILEGES IN SCHEMA util GRANT EXECUTE ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA util GRANT EXECUTE ON FUNCTIONS TO service_role;

-- Verify the permissions were granted
SELECT 
  'Updated util schema permissions' as info,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.schema_privileges 
WHERE schema_name = 'util'
ORDER BY grantee, privilege_type;

-- Show what functions exist in util schema
SELECT 
  'Functions in util schema' as info,
  proname as function_name,
  pg_get_function_result(oid) as return_type,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'util')
ORDER BY proname; 