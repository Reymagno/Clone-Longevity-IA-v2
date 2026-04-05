-- Firma Electronica Avanzada - Tablas para prescripciones firmadas

-- Certificados digitales de medicos (X.509 / e.firma)
CREATE TABLE IF NOT EXISTS medico_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_pem TEXT NOT NULL DEFAULT '',
  serial_number TEXT NOT NULL DEFAULT '',
  issuer TEXT NOT NULL DEFAULT '',
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '4 years'),
  subject_name TEXT NOT NULL DEFAULT '',
  rfc TEXT,
  curp TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medico_certificates_user ON medico_certificates(medico_user_id);
CREATE INDEX IF NOT EXISTS idx_medico_certificates_serial ON medico_certificates(serial_number);

-- Prescripciones firmadas digitalmente
CREATE TABLE IF NOT EXISTS signed_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id TEXT NOT NULL,
  medico_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  certificate_id UUID REFERENCES medico_certificates(id) ON DELETE SET NULL,
  pdf_hash_sha256 TEXT NOT NULL,
  signature_pkcs7 TEXT NOT NULL,
  timestamp_token TEXT,
  signed_pdf_path TEXT NOT NULL,
  verification_code TEXT UNIQUE NOT NULL,
  qr_url TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signed_rx_medico ON signed_prescriptions(medico_user_id);
CREATE INDEX IF NOT EXISTS idx_signed_rx_patient ON signed_prescriptions(patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_signed_rx_code ON signed_prescriptions(verification_code);

-- RLS policies
ALTER TABLE medico_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE signed_prescriptions ENABLE ROW LEVEL SECURITY;

-- Medicos pueden ver sus propios certificados
CREATE POLICY "Medicos manage own certificates" ON medico_certificates
  FOR ALL USING (auth.uid() = medico_user_id);

-- Medicos pueden ver sus propias prescripciones firmadas
CREATE POLICY "Medicos manage own signed prescriptions" ON signed_prescriptions
  FOR ALL USING (auth.uid() = medico_user_id);

-- Storage bucket para documentos clinicos (CDA XML)
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinical-documents', 'clinical-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Solo el owner puede acceder a sus documentos clinicos
CREATE POLICY "Users access own clinical documents" ON storage.objects
  FOR ALL USING (
    bucket_id = 'clinical-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
