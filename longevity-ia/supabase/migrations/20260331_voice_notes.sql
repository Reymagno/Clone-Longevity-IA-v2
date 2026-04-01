-- ============================================================
-- Tabla: voice_notes — Notas de voz transcritas para historial clínico
-- ============================================================

CREATE TABLE IF NOT EXISTS voice_notes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript  TEXT NOT NULL,
  ai_summary  TEXT,
  audio_url   TEXT,
  duration_seconds INTEGER,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_voice_notes_patient ON voice_notes(patient_id);
CREATE INDEX idx_voice_notes_user    ON voice_notes(user_id);
CREATE INDEX idx_voice_notes_created ON voice_notes(created_at DESC);

-- RLS
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;

-- El usuario puede ver/crear/borrar sus propias notas de voz
CREATE POLICY "voice_notes_own" ON voice_notes
  FOR ALL USING (auth.uid() = user_id);

-- Médicos vinculados pueden ver notas de sus pacientes
CREATE POLICY "voice_notes_medico_read" ON voice_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patient_medico_links pml
      WHERE pml.patient_id = voice_notes.patient_id
        AND pml.medico_user_id = auth.uid()
        AND pml.status = 'accepted'
    )
  );

-- ============================================================
-- Bucket de almacenamiento para archivos de audio
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO NOTHING;

-- Política: el usuario puede subir a su carpeta
CREATE POLICY "voice_notes_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'voice-notes'
    AND auth.uid() IS NOT NULL
  );

-- Política: el usuario puede leer sus propios archivos
CREATE POLICY "voice_notes_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'voice-notes'
    AND auth.uid() IS NOT NULL
  );

-- Política: el usuario puede borrar sus propios archivos
CREATE POLICY "voice_notes_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'voice-notes'
    AND auth.uid() IS NOT NULL
  );
