-- ============================================================
-- Longevity IA — Avatar URL columns for all role tables
-- ============================================================

-- Add avatar_url to profiles table (pacientes)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add avatar_url to medicos
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add avatar_url to clinicas (already has logo_url, this is for user avatar)
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS avatar_url TEXT;
