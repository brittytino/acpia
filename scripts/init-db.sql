-- ACPIA PostgreSQL Initialization Script
-- Creates the keycloak database for Keycloak authentication service

-- Create keycloak database
CREATE DATABASE keycloak;
GRANT ALL PRIVILEGES ON DATABASE keycloak TO acpia_user;

-- Enable required extensions on acpia DB
\c acpia;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Row level security setup (applied after migrations via Alembic)
-- The chain_of_custody_log table will have no UPDATE/DELETE grants
-- This is enforced after table creation in the seed script
