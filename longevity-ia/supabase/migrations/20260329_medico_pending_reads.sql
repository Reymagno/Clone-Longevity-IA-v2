-- ============================================================
-- Medico puede leer datos basicos de pacientes con invitacion pendiente
-- Ejecutar en Supabase SQL Editor (despues de 20260329_patient_medico_links.sql)
-- ============================================================

CREATE POLICY "Medico reads pending-linked patients" ON patients
  FOR SELECT USING (
    id IN (
      SELECT patient_id FROM patient_medico_links
      WHERE medico_user_id = auth.uid() AND status = 'pending'
    )
  );
