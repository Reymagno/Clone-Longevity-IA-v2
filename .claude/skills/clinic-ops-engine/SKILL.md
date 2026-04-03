---
name: clinic-ops-engine
description: >
  Motor operativo para clinicas medicas en la plataforma. Usa esta skill
  cuando necesites implementar funcionalidades del panel de clinica,
  gestion de medicos y pacientes, invitaciones por codigo, KPIs
  institucionales, QR de pacientes, timeline clinico, o cualquier feature
  del flujo clinica > medico > paciente. Triggers: "panel de clinica",
  "crear medico", "crear paciente desde clinica", "vincular medico",
  "codigo de clinica", "CLI-", "KPI clinica", "staff medico",
  "dashboard institucional", "QR paciente", "timeline".
---

# Clinic Ops Engine — Motor Operativo Institucional

Eres el experto en el sistema de gestion de clinicas de Longevity IA. Conoces la jerarquia Clinica > Medico > Paciente y todos los flujos operativos.

---

## 1. Jerarquia de Datos

```
CLINICA (user_id, code CLI-XXXXXX)
  └── MEDICOS (vinculados por clinica_id O clinica_medico_links)
      ├── Medicos creados directamente (clinica_id = clinica.id)
      └── Medicos vinculados por invitacion (clinica_medico_links.status = 'active')
          └── PACIENTES (de cada medico)
              ├── Pacientes creados por el medico (patients.user_id = medico.user_id)
              └── Pacientes vinculados por codigo MED (patient_medico_links.status = 'active')
```

### Regla critica
Cuando se listan pacientes de una clinica, SIEMPRE combinar las dos fuentes de medicos Y las dos fuentes de pacientes:

```typescript
// 1. Medicos: directos + vinculados por invitacion
const [directMedicos, linkedMedicos] = await Promise.all([
  admin.from('medicos').select('user_id').eq('clinica_id', clinic.id),
  admin.from('clinica_medico_links').select('medico_user_id').eq('clinica_id', clinic.id).eq('status', 'active'),
])
const allMedicoIds = new Set([
  ...(directMedicos.data ?? []).map(m => m.user_id),
  ...(linkedMedicos.data ?? []).map(l => l.medico_user_id),
])

// 2. Pacientes: creados por medicos + vinculados por codigo MED
const [ownedPatients, linkedPatients] = await Promise.all([
  admin.from('patients').select('*').in('user_id', [...allMedicoIds]),
  admin.from('patient_medico_links').select('patient_id').in('medico_user_id', [...allMedicoIds]).eq('status', 'active'),
])
// Merge sin duplicados usando Map por ID
```

---

## 2. Flujos Operativos

### Flujo A: Clinica crea medico directamente
```
Clinica → POST /api/clinica/medicos
  1. Verificar role === 'clinica'
  2. admin.auth.admin.createUser() (crea cuenta auth con role 'medico')
  3. INSERT medicos con clinica_id = clinic.id
  4. Generar codigo MED-XXXXXX
  5. Si falla INSERT → rollback: eliminar usuario auth
```

### Flujo B: Medico se vincula por codigo CLI-XXXXXX
```
Medico → POST /api/clinica/invitations { code: 'CLI-XXXXXX' }
  1. Verificar role === 'medico'
  2. Buscar clinica por codigo (USAR ADMIN: RLS bloquea cross-user)
  3. Verificar que no exista link previo
  4. INSERT clinica_medico_links con status 'pending'

Clinica → PATCH /api/clinica/invitations { invitation_id, action: 'accept' }
  1. Verificar role === 'clinica'
  2. UPDATE link status → 'active' (USAR ADMIN)
  3. UPDATE medicos.clinica_id = clinic.id (USAR ADMIN)
```

### Flujo C: Clinica crea paciente asignado a medico
```
Clinica → POST /api/clinica/patients
  1. Verificar role === 'clinica'
  2. Verificar que medico_user_id pertenece a la clinica
  3. admin.from('patients').insert() con user_id = medico_user_id, clinica_id = clinic.id
  4. Generar codigo LNG-XXXXXX
```

### Flujo D: Clinica desvincula medico
```
Clinica → PATCH /api/clinica/invitations { invitation_id, action: 'reject' }
  1. UPDATE clinica_medico_links status → 'revoked' (USAR ADMIN)
  2. UPDATE medicos SET clinica_id = null (USAR ADMIN)
```

---

## 3. Acceso a Dashboards

### Problema: RLS bloquea reads cross-user
La clinica no es user_id de ningun paciente ni medico. La RLS de patients y lab_results bloquea todo.

### Solucion: Admin client en server-side
```typescript
// En dashboard/page.tsx para rol 'clinica':
const admin = getSupabaseAdmin()
// 1. Verificar que el paciente pertenece a un medico de la clinica
// 2. Usar admin para leer patients + lab_results
db = admin as typeof supabase
```

### Verificacion de acceso (dashboard page):
```typescript
// El paciente es accesible si:
const isOwned = medicoIds.includes(patient.user_id)  // Medico lo creo
const isLinked = await admin.from('patient_medico_links')  // Medico lo tiene vinculado
  .select('id').eq('patient_id', patientId)
  .in('medico_user_id', medicoIds).eq('status', 'active').maybeSingle()
if (!isOwned && !isLinked) return null  // Acceso denegado
```

---

## 4. KPIs de la Clinica

| KPI | Query | Fuente |
|---|---|---|
| Total medicos | COUNT medicos donde clinica_id + clinica_medico_links activos | admin |
| Total pacientes | COUNT patients de todos los medicos (propios + vinculados por MED) | admin |
| Analisis este mes | COUNT lab_results con created_at >= primer dia del mes | admin |
| Alertas pendientes | COUNT medico_alerts no leidas de los medicos de la clinica | admin |

### Regla: Las alertas dependen de medicoUserIds, NO de patientIds
```typescript
// CORRECTO: fuera del bloque if (patientIds.length > 0)
const { count } = await admin.from('medico_alerts')
  .select('id', { count: 'exact', head: true })
  .in('medico_user_id', medicoUserIds)
  .eq('read', false).eq('dismissed', false)
```

---

## 5. Componentes del Panel

| Tab | Componente | Contenido |
|---|---|---|
| Resumen | ResumenTab | 4 KPIs + lista staff + actividad reciente |
| Medicos | MedicosTab | Grid medicos + busqueda + crear medico |
| Pacientes | PacientesTab | Lista filtrable + crear paciente + click → dashboard |
| Estadisticas | EstadisticasTab | Distribucion pacientes por medico |
| Invitaciones | InvitacionesTab | Pendientes (aceptar/rechazar) + activos (desvincular) |

---

## 6. Errores Comunes

| Sintoma | Causa | Solucion |
|---|---|---|
| Medicos no aparecen | clinica_id no se actualizo al aceptar | Usar admin para UPDATE |
| Pacientes vacios | RLS bloquea cross-user reads | Usar admin en API |
| Pacientes vinculados por MED no aparecen | Solo se busca por user_id | Combinar con patient_medico_links |
| Codigo CLI no se encuentra | RLS de clinicas bloquea | Buscar con admin client |
| Alertas siempre en 0 | Query anidada en bloque equivocado | Mover fuera del if patientIds |
| Stats no cuentan vinculados | Solo cuenta por clinica_id | Combinar clinica_id + clinica_medico_links |
