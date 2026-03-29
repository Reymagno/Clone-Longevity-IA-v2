// ============================================================
// SQL PARA CREAR TABLAS (para referencia)
// ============================================================
/*
-- Tabla patients
CREATE TABLE patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  weight DECIMAL,
  height DECIMAL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla lab_results
CREATE TABLE lab_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  result_date DATE NOT NULL,
  file_urls TEXT[] DEFAULT '{}',
  parsed_data JSONB,
  ai_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own patients" ON patients FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users see own lab_results" ON lab_results FOR ALL
USING (auth.uid() = (SELECT user_id FROM patients WHERE id = patient_id))
WITH CHECK (auth.uid() = (SELECT user_id FROM patients WHERE id = patient_id));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('lab-files', 'lab-files', true);
CREATE POLICY "Public access lab-files" ON storage.objects FOR ALL USING (bucket_id = 'lab-files');
*/
