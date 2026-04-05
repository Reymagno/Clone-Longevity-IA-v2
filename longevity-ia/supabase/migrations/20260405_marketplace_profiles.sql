-- Marketplace: campos profesionales para medicos y clinicas

-- Medicos: perfil profesional extendido
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS years_experience INTEGER;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS graduation_year INTEGER;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS subspecialties TEXT[] DEFAULT '{}';
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]';
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS previous_institutions JSONB DEFAULT '[]';
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS procedures_expertise TEXT[] DEFAULT '{}';
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{Espanol}';
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'employed' CHECK (employment_status IN ('employed', 'looking', 'open_to_offers', 'unavailable'));
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS preferred_modality TEXT[] DEFAULT '{}';
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS preferred_locations TEXT[] DEFAULT '{}';
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS salary_expectation_min INTEGER;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS salary_expectation_max INTEGER;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS available_from DATE;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS profile_public BOOLEAN DEFAULT false;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0;

-- Indices para busqueda de medicos
CREATE INDEX IF NOT EXISTS idx_medicos_employment ON medicos(employment_status) WHERE profile_public = true;
CREATE INDEX IF NOT EXISTS idx_medicos_specialty_public ON medicos(specialty) WHERE profile_public = true;

-- Clinicas: perfil institucional extendido
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS clinic_type TEXT DEFAULT 'consultorio' CHECK (clinic_type IN ('hospital', 'consultorio', 'centro_medico', 'laboratorio'));
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS clinic_size TEXT DEFAULT 'small' CHECK (clinic_size IN ('small', 'medium', 'large'));
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS services_offered TEXT[] DEFAULT '{}';
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS equipment TEXT[] DEFAULT '{}';
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS founded_year INTEGER;
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS monthly_patients TEXT DEFAULT '1-50' CHECK (monthly_patients IN ('1-50', '51-200', '201-500', '500+'));
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS hiring_active BOOLEAN DEFAULT false;

-- Tabla de vacantes de clinicas
CREATE TABLE IF NOT EXISTS clinic_vacancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  clinica_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  specialty_required TEXT NOT NULL,
  subspecialty_preferred TEXT[] DEFAULT '{}',
  min_experience_years INTEGER DEFAULT 0,
  modality TEXT NOT NULL DEFAULT 'full_time' CHECK (modality IN ('full_time', 'part_time', 'per_diem', 'remote_consult')),
  salary_min INTEGER,
  salary_max INTEGER,
  benefits TEXT[] DEFAULT '{}',
  description TEXT,
  urgency TEXT DEFAULT '3_months' CHECK (urgency IN ('immediate', '1_month', '3_months', 'exploratory')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'filled', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '90 days'),
  filled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vacancies_clinica ON clinic_vacancies(clinica_id);
CREATE INDEX IF NOT EXISTS idx_vacancies_status ON clinic_vacancies(status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_vacancies_specialty ON clinic_vacancies(specialty_required) WHERE status = 'open';

-- RLS
ALTER TABLE clinic_vacancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinicas manage own vacancies" ON clinic_vacancies
  FOR ALL USING (auth.uid() = clinica_user_id);
