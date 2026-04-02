-- ============================================================
-- CONSULTAS MÉDICAS — tabla, índices, RLS y storage
-- ============================================================

CREATE TABLE IF NOT EXISTS consultations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medico_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript      TEXT NOT NULL DEFAULT '',
  speakers        JSONB DEFAULT '{}',
  ai_summary      TEXT,
  ai_soap         JSONB,
  audio_url       TEXT,
  duration_seconds INTEGER,
  tags            TEXT[] DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'recording'
                    CHECK (status IN ('recording','transcribing','analyzing','completed','error')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_consultations_patient    ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_medico     ON consultations(medico_user_id);
CREATE INDEX IF NOT EXISTS idx_consultations_created    ON consultations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_status     ON consultations(status);

-- RLS
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- El médico que creó la consulta tiene control total
CREATE POLICY consultations_medico_own ON consultations
  FOR ALL USING (medico_user_id = auth.uid());

-- El paciente puede leer sus propias consultas
CREATE POLICY consultations_patient_read ON consultations
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- Médicos vinculados pueden leer consultas del paciente
CREATE POLICY consultations_linked_medico_read ON consultations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patient_medico_links pml
      WHERE pml.patient_id = consultations.patient_id
        AND pml.medico_user_id = auth.uid()
        AND pml.status = 'active'
    )
  );

-- ============================================================
-- Storage bucket para audio de consultas
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('consultation-audio', 'consultation-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
CREATE POLICY consultation_audio_upload ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'consultation-audio'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY consultation_audio_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'consultation-audio'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY consultation_audio_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'consultation-audio'
    AND auth.role() = 'authenticated'
  );
