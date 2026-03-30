-- Permitir que el dueño del paciente pueda eliminar resultados de laboratorio
-- El dueño es el usuario cuyo user_id coincide con patients.user_id

CREATE POLICY "Owner can delete lab_results" ON lab_results
  FOR DELETE USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- También asegurar que el dueño pueda hacer INSERT y UPDATE (si no existen)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lab_results' AND policyname = 'Owner can insert lab_results'
  ) THEN
    CREATE POLICY "Owner can insert lab_results" ON lab_results
      FOR INSERT WITH CHECK (
        patient_id IN (
          SELECT id FROM patients WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lab_results' AND policyname = 'Owner can update lab_results'
  ) THEN
    CREATE POLICY "Owner can update lab_results" ON lab_results
      FOR UPDATE USING (
        patient_id IN (
          SELECT id FROM patients WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lab_results' AND policyname = 'Owner can select lab_results'
  ) THEN
    CREATE POLICY "Owner can select lab_results" ON lab_results
      FOR SELECT USING (
        patient_id IN (
          SELECT id FROM patients WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;
