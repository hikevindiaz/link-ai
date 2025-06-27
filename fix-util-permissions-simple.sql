-- Simple fix for util schema permissions
-- Grant only the minimum permissions needed for file upload triggers to work

-- Grant usage on util schema to authenticated users and service role
GRANT USAGE ON SCHEMA util TO authenticated;
GRANT USAGE ON SCHEMA util TO service_role;

-- Grant execute permissions on util functions to authenticated users and service role
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA util TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA util TO service_role;

-- Set default privileges for future functions in util schema
ALTER DEFAULT PRIVILEGES IN SCHEMA util GRANT EXECUTE ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA util GRANT EXECUTE ON FUNCTIONS TO service_role;

-- Verify by checking if we can see the functions now
SELECT 
  'Functions in util schema' as info,
  proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'util'
ORDER BY proname; 