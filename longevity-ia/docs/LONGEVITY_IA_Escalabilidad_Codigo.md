# LONGEVITY IA — Analisis de Escalabilidad del Codigo

**Evaluacion tecnica: del MVP a 1,000 analisis simultaneos**

Version 1.0 | Marzo 2026

Derechos reservados - Longevity Clinic SA de CV

---

## 1. Diagnostico del Codigo Actual

### 1.1 Estado general

El codigo actual de Longevity IA esta construido sobre Next.js 14 con TypeScript. La arquitectura es monolitica (frontend + backend en un solo proyecto), desplegada en Vercel como funciones serverless.

| Metrica | Valor actual |
|---------|-------------|
| Archivos totales del proyecto | ~60 |
| Lineas de codigo estimadas | ~8,000+ |
| Lenguaje | TypeScript 100% |
| Framework | Next.js 14 (App Router) |
| Deploy | Vercel Serverless |
| Base de datos | Supabase (PostgreSQL) |
| IA | Anthropic Claude Sonnet via API |
| Analisis simultaneos maximos | 3-5 |

### 1.2 Limite actual: por que no escala

El cuello de botella principal es que el analisis de IA se ejecuta **dentro de la request HTTP** de una funcion serverless de Vercel:

```
POST /api/analyze
  → Subir archivos (5-10s)
  → Extraer biomarcadores con Claude (30-60s)
  → Guardar parsedData en DB
  → Generar analisis IA completo con Claude (90-180s)
  → Guardar ai_analysis en DB
  → Responder al cliente
TOTAL: 3-5 minutos bloqueados en una sola funcion
```

**Limites de Vercel:**
- maxDuration: 300 segundos (5 min) — el analisis a veces excede esto
- Funciones simultaneas: 10-50 (Hobby) / 1,000 (Pro) — pero cada una bloqueada 5 min
- Cold starts: 2-5 segundos adicionales

**Limites de Anthropic API:**
- Tier 1: 50 req/min — maximo ~5 analisis simultaneos
- Cada analisis hace 2 llamadas a Claude

---

## 2. Veredicto: Se debe cambiar el codigo?

**No se requiere reescribir.** Se requiere **reorganizar** una parte menor del codigo.

| Porcentaje del codigo | Accion |
|----------------------|--------|
| 70% | Se mantiene exactamente igual, sin cambios |
| 13% | Cambios menores (configuracion, conexiones) |
| 12% | Cambios significativos (3 archivos clave) |
| 5% | Archivos nuevos (worker, cola, Docker) |

---

## 3. Codigo que NO Cambia (70%)

Estos archivos y componentes funcionan perfectamente a cualquier escala y no requieren ninguna modificacion:

### 3.1 Frontend completo

| Archivo/Directorio | Descripcion | Lineas aprox |
|-------------------|-------------|--------------|
| src/components/dashboard/tabs/SummaryTab.tsx | Tab de resumen con scores y edad biologica | ~890 |
| src/components/dashboard/tabs/SwotTab.tsx | Tab FODA medica | ~405 |
| src/components/dashboard/tabs/ProjectionTab.tsx | Tab proyeccion 10 anos | ~305 |
| src/components/dashboard/tabs/ProtocolTab.tsx | Tab protocolo con referencias verificadas | ~140 |
| src/components/dashboard/tabs/LipidsTab.tsx | Tab lipidos | ~200 |
| src/components/dashboard/tabs/MetabolicTab.tsx | Tab metabolico | ~180 |
| src/components/dashboard/tabs/OrganHealthTab.tsx | Tab salud de organos | ~250 |
| src/components/dashboard/tabs/StemCellTab.tsx | Tab celulas madre hUC-MSC | ~750 |
| src/components/dashboard/tabs/ClinicalHistoryTab.tsx | Tab historia clinica | ~300 |
| src/components/dashboard/tabs/CompareTab.tsx | Tab comparacion entre analisis | ~200 |
| src/components/dashboard/tabs/FilesTab.tsx | Tab archivos del estudio | ~100 |
| src/components/dashboard/DashboardTabs.tsx | Contenedor principal del dashboard | ~480 |
| src/components/dashboard/ExportButtons.tsx | Botones de exportacion PDF | ~150 |
| src/components/dashboard/LongevityChat.tsx | Chat conversacional con IA | ~300 |
| src/components/dashboard/InstantDashboard.tsx | Dashboard inmediato pre-IA | ~400 |
| src/components/dashboard/VerifiedReferences.tsx | Referencias PubMed/Semantic Scholar | ~210 |
| src/components/dashboard/MethodologyFooter.tsx | Pie de pagina metodologia propietaria | ~120 |
| src/components/patients/PatientCard.tsx | Tarjeta de paciente | ~520 |
| src/components/patients/NewPatientModal.tsx | Modal crear paciente | ~200 |
| src/components/patients/MedicoLinksPanel.tsx | Panel vinculacion medicos | ~250 |
| src/components/medico/InvitationsPanel.tsx | Panel invitaciones medico | ~160 |
| src/components/ui/* | Componentes UI base (Button, Input, etc.) | ~400 |

### 3.2 Logica de negocio

| Archivo | Descripcion | Lineas aprox |
|---------|-------------|--------------|
| src/lib/anthropic/analyzer.ts (PROMPTS) | System prompt, user prompt, logica propietaria | ~600 |
| src/lib/anthropic/analyzer.ts (VALIDACION) | Validacion de respuesta JSON, deduplicacion protocolo | ~400 |
| src/lib/biomarker-ranges.ts | Catalogo de 133 biomarcadores con rangos | ~2,000 |
| src/lib/medical-references.ts | Busqueda en PubMed, Semantic Scholar, OpenAlex | ~250 |
| src/lib/utils.ts | Utilidades (formatDate, scores, colores, hash) | ~135 |
| src/types/index.ts | Tipos TypeScript completos | ~290 |

### 3.3 Paginas

| Archivo | Descripcion |
|---------|-------------|
| src/app/page.tsx | Landing page |
| src/app/login/page.tsx | Pagina de login |
| src/app/onboarding/page.tsx | Onboarding nuevo paciente |
| src/app/patients/page.tsx | Lista de pacientes |
| src/app/patients/[id]/dashboard/page.tsx | Pagina del dashboard (server component) |
| src/app/patients/[id]/intake/page.tsx | Formulario historia clinica |

---

## 4. Codigo que Cambia Poco (13%)

Estos archivos requieren ajustes menores de configuracion:

### 4.1 Conexion a base de datos

| Archivo | Cambio requerido |
|---------|-----------------|
| src/lib/supabase/server.ts | Cambiar connection string a RDS + PgBouncer |
| src/lib/supabase/client.ts | Sin cambios (usa Supabase Auth que se mantiene) |
| src/middleware.ts | Sin cambios |

### 4.2 API routes que se mantienen

| Archivo | Cambio |
|---------|--------|
| src/app/api/patients/route.ts | Ninguno |
| src/app/api/patients/[id]/route.ts | Ninguno |
| src/app/api/patients/[id]/clinical-update/route.ts | Ninguno |
| src/app/api/patients/me/route.ts | Ninguno |
| src/app/api/medico/invitations/route.ts | Ninguno |
| src/app/api/references/route.ts | Ninguno |
| src/app/api/results/[id]/route.ts | Ninguno |
| src/app/api/chat/route.ts | Ninguno (streaming a Claude es independiente) |

---

## 5. Codigo que Cambia Significativamente (12%)

Estos son los **3 archivos criticos** que deben modificarse para soportar 1,000 simultaneos:

### 5.1 Archivo 1: src/app/api/analyze/route.ts

**Hoy (~200 lineas):** Recibe archivos, sube a storage, llama a Claude 2 veces, guarda en DB, responde con SSE durante 3-5 min.

**Despues (~50 lineas):** Recibe archivos, sube a storage, encola trabajo, responde con jobId en menos de 1 segundo.

**Codigo actual (simplificado):**
```
export async function POST(request) {
  // Subir archivos → Storage
  // Extraer biomarcadores → Claude (60s bloqueado)
  // Guardar parsedData → DB
  // Generar analisis IA → Claude (120s bloqueado)
  // Guardar ai_analysis → DB
  // Enviar SSE al cliente
}
// TOTAL: 3-5 min bloqueados en una request HTTP
```

**Codigo escalado (simplificado):**
```
export async function POST(request) {
  // Subir archivos → Storage (5s)
  // Crear registro lab_result con status 'queued'
  // Encolar trabajo en SQS/BullMQ
  // Responder { jobId, status: 'queued' } (200ms)
}
// TOTAL: <1 segundo, la request se libera inmediatamente
```

### 5.2 Archivo 2: src/app/api/results/[id]/reanalyze/route.ts

**Hoy (~125 lineas):** Re-analisis ejecutado dentro de request HTTP con SSE.

**Despues (~40 lineas):** Encola re-analisis, responde inmediatamente.

**Mismo patron que analyze:** encolar → responder → worker procesa.

### 5.3 Archivo 3: src/app/patients/[id]/upload/page.tsx

**Hoy (~300 lineas):** Lee SSE stream del analisis en tiempo real durante 3-5 min.

**Despues (~300 lineas, ~30 lineas cambian):** Envia archivos, recibe jobId, hace polling cada 3 segundos o escucha via Supabase Realtime.

**Cambio en el frontend:**
```
// HOY: lee SSE stream
const response = await fetch('/api/analyze', { method: 'POST', body: formData })
const reader = response.body.getReader()
while (true) {
  const { done, value } = await reader.read()
  // procesar eventos SSE durante 3-5 min...
}

// DESPUES: polling o Realtime
const response = await fetch('/api/analyze', { method: 'POST', body: formData })
const { jobId } = await response.json()  // respuesta en <1s

// Opcion A: Polling
const interval = setInterval(async () => {
  const status = await fetch(`/api/jobs/${jobId}`)
  if (status.step === 'done') {
    clearInterval(interval)
    router.push(`/patients/${patientId}/dashboard`)
  }
  updateProgress(status.step)
}, 3000)

// Opcion B: Supabase Realtime (preferido)
supabase.channel('job-' + jobId)
  .on('broadcast', { event: 'progress' }, (payload) => {
    updateProgress(payload.step)
    if (payload.step === 'done') router.push(...)
  })
  .subscribe()
```

---

## 6. Archivos Nuevos (5%)

Estos archivos se crean desde cero para la arquitectura escalada:

### 6.1 worker/analyze-worker.ts (~150 lineas)

Proceso que corre en un contenedor Docker, escucha la cola y ejecuta analisis:

```
// Importa las MISMAS funciones de analyzer.ts (no se duplica logica)
import { extractBiomarkers, reanalyzeWithClinicalHistory } from '../src/lib/anthropic/analyzer'

// Escucha cola SQS/BullMQ
while (true) {
  const job = await queue.receive()

  // Ejecuta el analisis (misma logica que hoy)
  const parsedData = await extractBiomarkers(job.files)
  const aiAnalysis = await reanalyzeWithClinicalHistory(parsedData, job.patient)

  // Guarda en DB
  await db.update('lab_results', job.resultId, { parsed_data: parsedData, ai_analysis: aiAnalysis })

  // Notifica al frontend
  await notify(job.userId, { step: 'done', resultId: job.resultId })
}
```

**Punto clave:** El worker reutiliza `analyzer.ts` tal cual. No se reescribe la logica de IA.

### 6.2 worker/queue-config.ts (~50 lineas)

Configuracion de la cola de trabajos:

```
// Conexion a SQS o Redis
// Definicion de colas: analysis, reanalysis, monitoring, alerts
// Configuracion de retry, timeout, dead-letter
```

### 6.3 Dockerfile (~30 lineas)

Imagen Docker para los workers:

```
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
CMD ["node", "worker/analyze-worker.js"]
```

### 6.4 src/app/api/jobs/[id]/route.ts (~30 lineas)

Endpoint nuevo para consultar el estado de un trabajo:

```
GET /api/jobs/{jobId}
Respuesta: { step: 'queued' | 'extracting' | 'analyzing' | 'done', progress: 0-100 }
```

---

## 7. Resumen de Impacto por Archivo

| Archivo | Lineas actuales | Accion | Lineas que cambian |
|---------|----------------|--------|-------------------|
| src/app/api/analyze/route.ts | ~200 | Reescribir (simplificar) | ~200 → ~50 |
| src/app/api/results/[id]/reanalyze/route.ts | ~125 | Reescribir (simplificar) | ~125 → ~40 |
| src/app/patients/[id]/upload/page.tsx | ~300 | Modificar parcialmente | ~30 lineas |
| src/lib/supabase/server.ts | ~30 | Ajustar conexion | ~5 lineas |
| worker/analyze-worker.ts | NUEVO | Crear | ~150 lineas |
| worker/queue-config.ts | NUEVO | Crear | ~50 lineas |
| Dockerfile | NUEVO | Crear | ~30 lineas |
| src/app/api/jobs/[id]/route.ts | NUEVO | Crear | ~30 lineas |
| **TOTAL CAMBIOS** | | | **~335 lineas de ~8,000+** |

**Porcentaje de codigo que cambia: ~4% de reescritura + ~3% de codigo nuevo = 7% total.**

---

## 8. Lo que NO se Toca (y por que)

### 8.1 Prompts de IA (analyzer.ts)

Los prompts SYSTEM_PROMPT y USER_PROMPT son identicos en el worker y en la funcion serverless. La logica propietaria de Longevity IA (scores, edad biologica, FODA, proyeccion) no depende de la infraestructura.

### 8.2 Catalogo de biomarcadores (biomarker-ranges.ts)

Los 133 biomarcadores con rangos por edad/genero son datos estaticos que funcionan en cualquier entorno.

### 8.3 Frontend completo

Todos los componentes de React renderizan datos que vienen de la base de datos. No les importa si el analisis fue generado por un serverless function o un contenedor Docker — el JSON en `lab_results.ai_analysis` es identico.

### 8.4 APIs de referencia medica (medical-references.ts)

Las busquedas en PubMed, Semantic Scholar y OpenAlex son independientes del flujo de analisis.

---

## 9. Esfuerzo de Implementacion

### 9.1 Tiempo estimado

| Tarea | Dias | Responsable |
|-------|------|-------------|
| Configurar cola (SQS o BullMQ + Redis) | 2-3 | Backend Senior |
| Crear worker con Docker | 3-5 | Backend Senior |
| Reescribir analyze/route.ts (encolar) | 1-2 | Backend |
| Reescribir reanalyze/route.ts (encolar) | 1 | Backend |
| Crear endpoint /api/jobs/[id] | 1 | Backend |
| Modificar upload/page.tsx (polling/realtime) | 2-3 | Frontend |
| Migrar DB a RDS + PgBouncer | 3-5 | DevOps |
| Configurar ECS Fargate auto-scaling | 3-5 | DevOps |
| Testing de carga (k6 o Artillery) | 3-5 | QA |
| **TOTAL** | **20-30 dias** | **1-2 personas** |

### 9.2 Riesgo de regresion

| Area | Riesgo | Mitigacion |
|------|--------|-----------|
| Analisis IA | Bajo — misma logica, mismo prompt | Tests de integracion con archivos de prueba |
| Frontend | Bajo — solo cambia flujo de polling | Test manual en staging |
| Base de datos | Medio — migracion de Supabase a RDS | Backup antes de migrar, dual-write temporal |
| Auth | Nulo — Supabase Auth se mantiene | Sin cambios |

---

## 10. Conclusion

Longevity IA tiene una **arquitectura de codigo solida** que fue disenada con separacion clara entre presentacion (React), logica de negocio (analyzer.ts, biomarker-ranges.ts) y datos (Supabase).

**El 93% del codigo se mantiene intacto.** Solo el 7% requiere cambios, concentrados en 3 archivos existentes y 4 archivos nuevos. La logica de IA, los prompts, la validacion, el catalogo de biomarcadores, las referencias medicas y toda la interfaz de usuario no se modifican.

El esfuerzo es de **4-6 semanas con 1-2 personas**, principalmente enfocado en infraestructura (colas, contenedores, base de datos) y no en reescritura de logica de negocio.

La escalabilidad de Longevity IA esta limitada por infraestructura, no por codigo. Una vez implementados los cambios descritos, el sistema puede manejar 1,000 analisis simultaneos con el mismo codigo de IA que analiza 1 paciente hoy.

---

*Documento generado por Longevity IA v2.0*

*Derechos reservados - Longevity Clinic SA de CV*
