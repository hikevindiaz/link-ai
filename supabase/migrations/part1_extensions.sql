-- Part 1: Install Extensions
-- Run this first to set up all required extensions

-- Set search path
SET search_path TO public, extensions;

-- Vector extension (already installed, but safe to run)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- pg_net extension (already installed, but safe to run)  
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create pgmq schema and extension
CREATE SCHEMA IF NOT EXISTS pgmq;
CREATE EXTENSION IF NOT EXISTS pgmq WITH SCHEMA pgmq;

-- Optional: pg_cron (will skip if not available)
DO $$ 
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron extension not available, skipping';
END $$; 