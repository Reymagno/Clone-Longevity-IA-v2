-- Notas clínicas del médico (formato SOAP)
CREATE TABLE IF NOT EXISTS clinical_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medico_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  result_id UUID REFERENCES lab_results(id) ON DELETE SET NULL,
  note_type TEXT NOT NULL DEFAULT 'soap',  -- 'soap', 'follow_up', 'comment', 'protocol_adjustment'
  subjective TEXT,            -- S: lo que el paciente reporta
  objective TEXT,             -- O: hallazgos objetivos del médico
  assessment TEXT,            -- A: evaluación/diagnósticos
  plan TEXT,                  -- P: plan de tratamiento
  content TEXT,               -- Nota libre (para tipos no-SOAP)
  biomarker_key TEXT,         -- Si es comentario sobre un biomarcador específico
  protocol_adjustments JSONB, -- Cambios al protocolo: [{molecule, action: 'approve'|'reject'|'modify', newDose, reason}]
  diagnoses TEXT[],           -- Códigos CIE-10
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clinical_notes_patient ON clinical_notes(patient_id, created_at DESC);
CREATE INDEX idx_clinical_notes_medico ON clinical_notes(medico_user_id, created_at DESC);
CREATE INDEX idx_clinical_notes_result ON clinical_notes(result_id);

-- RLS: médico puede CRUD sus propias notas
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medico manages own notes" ON clinical_notes
  FOR ALL USING (medico_user_id = auth.uid());

-- Alertas del médico
CREATE TABLE IF NOT EXISTS medico_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  result_id UUID REFERENCES lab_results(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,   -- 'new_analysis', 'biomarker_danger', 'biomarker_worsened', 'wearable_alert', 'follow_up_due'
  level TEXT NOT NULL DEFAULT 'info',  -- 'info', 'warning', 'danger', 'critical'
  title TEXT NOT NULL,
  detail TEXT,
  metadata JSONB,             -- datos específicos de la alerta
  read BOOLEAN DEFAULT false,
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_medico_alerts_medico ON medico_alerts(medico_user_id, read, created_at DESC);
CREATE INDEX idx_medico_alerts_patient ON medico_alerts(patient_id, created_at DESC);

ALTER TABLE medico_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medico manages own alerts" ON medico_alerts
  FOR ALL USING (medico_user_id = auth.uid());

-- Seguimiento de citas/próximos pasos
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medico_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                -- "Repetir perfil lipídico"
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',      -- 'pending', 'completed', 'overdue', 'cancelled'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_follow_ups_medico ON follow_ups(medico_user_id, status, due_date);
CREATE INDEX idx_follow_ups_patient ON follow_ups(patient_id, due_date);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medico manages own follow_ups" ON follow_ups
  FOR ALL USING (medico_user_id = auth.uid());
