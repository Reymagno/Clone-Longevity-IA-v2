-- ============================================================
-- Longevity IA — Clinica Invitation Code System
-- Add unique code to clinicas + clinica_medico_links table
-- ============================================================

-- Add unique code to clinicas for invitation system
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

-- Create clinica_medico_links table for invitation tracking
CREATE TABLE IF NOT EXISTS clinica_medico_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  medico_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(clinica_id, medico_user_id)
);

-- RLS
ALTER TABLE clinica_medico_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage links" ON clinica_medico_links FOR ALL USING (auth.uid() IS NOT NULL);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clinica_medico_links_clinica ON clinica_medico_links(clinica_id);
CREATE INDEX IF NOT EXISTS idx_clinica_medico_links_medico ON clinica_medico_links(medico_user_id);
