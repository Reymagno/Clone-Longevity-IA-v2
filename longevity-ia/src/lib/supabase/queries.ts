import { supabase } from './client'
import type { Patient, LabResult, PatientWithLatestResult, Gender } from '@/types'

// ============================================================
// PACIENTES
// ============================================================

export async function getPatients(): Promise<PatientWithLatestResult[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*, lab_results(id, patient_id, result_date, file_urls, parsed_data, ai_analysis, created_at)')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map((patient) => {
    const { lab_results, ...patientData } = patient as typeof patient & { lab_results: LabResult[] }
    const sorted = (lab_results || []).sort(
      (a, b) => new Date(b.result_date).getTime() - new Date(a.result_date).getTime()
    )
    return {
      ...patientData,
      latest_result: sorted[0] || null,
    } as PatientWithLatestResult
  })
}

export async function getPatientById(id: string): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createPatient(patient: {
  name: string
  code: string
  age: number
  gender: Gender
  weight?: number
  height?: number
  notes?: string
}): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .insert(patient)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function generatePatientCode(): Promise<string> {
  const prefix = 'LNG'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

// ============================================================
// RESULTADOS DE LABORATORIO
// ============================================================

export async function getLabResultsByPatient(patientId: string): Promise<LabResult[]> {
  const { data, error } = await supabase
    .from('lab_results')
    .select('*')
    .eq('patient_id', patientId)
    .order('result_date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getLabResultById(id: string): Promise<LabResult | null> {
  const { data, error } = await supabase
    .from('lab_results')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createLabResult(result: {
  patient_id: string
  result_date: string
  file_urls: string[]
  parsed_data?: object
  ai_analysis?: object
}): Promise<LabResult> {
  const { data, error } = await supabase
    .from('lab_results')
    .insert(result)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateLabResult(
  id: string,
  updates: {
    parsed_data?: object
    ai_analysis?: object
  }
): Promise<LabResult> {
  const { data, error } = await supabase
    .from('lab_results')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// STORAGE
// ============================================================

export async function uploadLabFile(
  file: File,
  patientId: string
): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${patientId}/${Date.now()}.${fileExt}`

  const { error } = await supabase.storage
    .from('lab-files')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) throw error

  const { data } = supabase.storage.from('lab-files').getPublicUrl(fileName)
  return data.publicUrl
}

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
