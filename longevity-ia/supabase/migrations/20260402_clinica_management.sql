-- ============================================================
-- Clínica Management: vincular médicos y pacientes a clínicas
-- ============================================================

-- Agregar clinica_id a medicos y patients
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES clinicas(id) ON DELETE SET NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES clinicas(id) ON DELETE SET NULL;
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS logo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_medicos_clinica ON medicos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinica ON patients(clinica_id);
