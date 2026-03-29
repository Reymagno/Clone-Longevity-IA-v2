-- ============================================================
-- Longevity IA — Roles, Profiles, Medicos, Clinicas
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Tabla de perfiles (todos los usuarios)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'paciente' CHECK (role IN ('paciente', 'medico', 'clinica')),
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role inserts profiles" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Tabla de médicos
CREATE TABLE IF NOT EXISTS medicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  license_number TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE medicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Medicos read own" ON medicos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Medicos update own" ON medicos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Medicos insert own" ON medicos FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Tabla de clínicas
CREATE TABLE IF NOT EXISTS clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_name TEXT NOT NULL,
  rfc TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  director_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE clinicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinicas read own" ON clinicas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Clinicas update own" ON clinicas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Clinicas insert own" ON clinicas FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Trigger: crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'role', 'paciente'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop si ya existe para re-crear
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
