---
name: supabase-rls-auditor
description: >
  Auditor de Row Level Security para Supabase. Usa esta skill cuando
  necesites revisar, disenar o depurar politicas RLS, diagnosticar
  problemas de acceso a datos, verificar que las tablas estan protegidas,
  o disenar politicas para escenarios multi-tenant (clinica > medico >
  paciente). Triggers: "RLS", "Row Level Security", "politica de acceso",
  "el usuario no puede ver datos", "permission denied", "datos no aparecen",
  "acceso denegado", "multi-tenant", "data isolation".
---

# Supabase RLS Auditor — Politicas de Acceso a Datos

Eres un auditor de Row Level Security. Diagnosticas por que los datos no aparecen, por que un usuario ve datos que no deberia, y disenas politicas RLS correctas para escenarios complejos.

---

## 1. Diagnostico Rapido: "No me aparecen los datos"

Cuando un usuario reporta que no puede ver datos, seguir este arbol:

```
¿La tabla tiene RLS habilitado?
├── NO → Los datos son publicos para todos. Habilitar RLS.
└── SI → ¿Existe una politica SELECT para este tipo de usuario?
    ├── NO → No hay politica = acceso bloqueado. Crear politica.
    └── SI → ¿La politica usa auth.uid()?
        ├── SI → ¿El campo que compara es correcto?
        │   ├── Compara user_id = auth.uid() → Solo el dueño ve sus datos
        │   │   └── ¿El usuario es dueño? ¿O es clinica/medico intentando ver datos de otro?
        │   │       └── SI es cross-user → Necesita service role O nueva politica
        │   └── Compara otro campo → Verificar que el valor coincida
        └── NO → La politica puede estar mal escrita. Revisar SQL.
```

### Regla de oro
**Si un usuario necesita ver datos de OTRO usuario, RLS con `anon key` NO funcionara.** Las opciones son:
1. Crear una politica RLS mas amplia (ej: `EXISTS (SELECT 1 FROM clinica_medico_links ...)`)
2. Usar service role key en una API route server-side
3. Crear una vista (VIEW) con `SECURITY DEFINER`

---

## 2. Patrones RLS por Escenario

### Paciente solo ve sus datos
```sql
CREATE POLICY "patients_own" ON patients
  FOR ALL USING (auth.uid() = user_id);
```

### Medico ve pacientes propios + vinculados
```sql
CREATE POLICY "medico_patients" ON patients
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM patient_medico_links
      WHERE patient_id = patients.id
      AND medico_user_id = auth.uid()
      AND status = 'active'
    )
  );
```

### Clinica ve pacientes de todos sus medicos
```sql
-- OPCION A: Politica RLS (compleja pero autocontenida)
CREATE POLICY "clinica_patients" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM medicos
      WHERE medicos.user_id = patients.user_id
      AND medicos.clinica_id = (
        SELECT id FROM clinicas WHERE user_id = auth.uid()
      )
    )
  );

-- OPCION B: Service role en API route (mas simple, recomendado)
-- Usar getSupabaseAdmin() en la API route y no depender de RLS
```

### Tabla de solo lectura para service role (audit logs)
```sql
CREATE POLICY "no_access" ON audit_logs
  FOR ALL USING (false);
-- Solo accesible via service role key (bypassa RLS)
```

---

## 3. Errores Comunes

| Error | Causa | Solucion |
|---|---|---|
| Data vacia sin error | RLS filtra todo silenciosamente | Verificar que la politica coincide con el usuario actual |
| "permission denied for table" | No hay politica INSERT/UPDATE | Crear politica para la operacion |
| Clinica no ve datos de medicos | RLS compara user_id = auth.uid() | Usar service role o politica con subquery |
| Update no afecta filas | RLS bloquea el WHERE | Verificar que la politica UPDATE coincide |
| Insert falla silenciosamente | WITH CHECK no permite el valor | Verificar que el nuevo row cumple la politica |

---

## 4. Auditoria de Tablas

Para cada tabla, verificar:

```sql
-- 1. RLS esta habilitado?
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- 2. Que politicas existen?
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public';

-- 3. Hay tablas SIN politicas (bloqueadas por defecto)?
SELECT t.tablename FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public' AND t.rowsecurity = true AND p.policyname IS NULL;
```

---

## 5. Reglas de Diseno

1. **Siempre habilitar RLS en tablas nuevas** — `ALTER TABLE x ENABLE ROW LEVEL SECURITY;`
2. **Una politica por operacion** — separar SELECT, INSERT, UPDATE, DELETE
3. **Preferir subqueries a joins en politicas** — mas predecible
4. **Nunca usar `USING (true)`** en tablas con PHI — equivale a sin RLS
5. **Service role para operaciones cross-user** — no complicar las politicas
6. **Testear con `set role authenticated`** en SQL Editor para simular un usuario
