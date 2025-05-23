-- Drop test database if it exists
DROP DATABASE IF EXISTS fbo_launchpad_test;

-- Create test database
CREATE DATABASE fbo_launchpad_test;

-- Connect to test database
\c fbo_launchpad_test

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE fbo_launchpad_test TO fbo_user; 