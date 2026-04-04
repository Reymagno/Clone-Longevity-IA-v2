-- ============================================================================
-- USER SESSIONS — Tracking de sesiones para analytics de actividad
-- Permite a clínicas consultar: logins por médico, médicos activos,
-- tiempo en plataforma, última actividad, etc.
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL CHECK (user_role IN ('paciente', 'medico', 'clinica')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Solo service role puede acceder (las queries van via admin client)
CREATE POLICY "Service role only" ON user_sessions FOR ALL USING (false);

-- Índices para queries frecuentes del agente
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_role ON user_sessions(user_role);
CREATE INDEX idx_sessions_started ON user_sessions(started_at DESC);
CREATE INDEX idx_sessions_last_seen ON user_sessions(last_seen_at DESC);

-- Índice compuesto para: "médicos activos esta semana" (query más frecuente)
CREATE INDEX idx_sessions_role_started ON user_sessions(user_role, started_at DESC);

-- Índice compuesto para: "sesiones de un usuario en un periodo"
CREATE INDEX idx_sessions_user_started ON user_sessions(user_id, started_at DESC);

-- ============================================================================
-- AMPLIAR audit_logs — nuevas acciones para tracking de actividad
-- ============================================================================

-- Índice para queries por acción + periodo (ej: "cuántos analyze_lab esta semana")
CREATE INDEX IF NOT EXISTS idx_audit_action_created ON audit_logs(action, created_at DESC);

-- Índice compuesto para: "actividad de un usuario por tipo"
CREATE INDEX IF NOT EXISTS idx_audit_user_action ON audit_logs(user_id, action, created_at DESC);

-- Índice para queries por rol (ej: "toda la actividad de médicos")
CREATE INDEX IF NOT EXISTS idx_audit_role ON audit_logs(user_role, created_at DESC);
