-- ============================================================
-- Longevity IA — Vinculos Paciente-Medico
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Tabla de vínculos paciente → médico
-- status: pending (invitado), active (confirmado), revoked (revocado)
CREATE TABLE IF NOT EXISTS patient_medico_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medico_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medico_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(patient_id, medico_email)
);

ALTER TABLE patient_medico_links ENABLE ROW LEVEL SECURITY;

-- Paciente ve sus propios vinculos
CREATE POLICY "Patient sees own links" ON patient_medico_links
  FOR SELECT USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

-- Paciente crea vinculos para sus pacientes
CREATE POLICY "Patient creates own links" ON patient_medico_links
  FOR INSERT WITH CHECK (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

-- Paciente actualiza (revoca) sus vinculos
CREATE POLICY "Patient updates own links" ON patient_medico_links
  FOR UPDATE USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

-- Medico ve vinculos donde es destinatario
CREATE POLICY "Medico sees assigned links" ON patient_medico_links
  FOR SELECT USING (medico_user_id = auth.uid());

-- Medico actualiza (confirma) vinculos asignados a el
CREATE POLICY "Medico updates assigned links" ON patient_medico_links
  FOR UPDATE USING (medico_user_id = auth.uid());

-- Medico puede leer pacientes vinculados activos (lectura compartida)
CREATE POLICY "Medico reads linked patients" ON patients
  FOR SELECT USING (
    id IN (
      SELECT patient_id FROM patient_medico_links
      WHERE medico_user_id = auth.uid() AND status = 'active'
    )
  );

-- Medico puede leer lab_results de pacientes vinculados activos
CREATE POLICY "Medico reads linked lab_results" ON lab_results
  FOR SELECT USING (
    patient_id IN (
      SELECT patient_id FROM patient_medico_links
      WHERE medico_user_id = auth.uid() AND status = 'active'
    )
  );
