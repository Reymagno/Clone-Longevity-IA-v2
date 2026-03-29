-- ============================================================
-- Agregar user_id a patients para vincular con auth.users
-- ============================================================

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Índice para búsquedas por user_id
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);

-- RLS: el paciente solo ve sus propios registros
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients_own_read" ON patients
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM patient_medico_links
      WHERE patient_medico_links.patient_id = patients.id
        AND patient_medico_links.medico_user_id = auth.uid()
        AND patient_medico_links.status = 'active'
    )
  );

CREATE POLICY "patients_own_insert" ON patients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "patients_own_update" ON patients
  FOR UPDATE USING (auth.uid() = user_id);
