-- Agregar código único a medicos para vinculación por código
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_medicos_code ON medicos(code);
