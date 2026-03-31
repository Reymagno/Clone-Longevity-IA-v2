# LONGEVITY IA — Infraestructura Tecnologica para 1,000 Analisis Simultaneos

**Plataforma de Inteligencia Artificial para Medicina de Longevidad**

Version 1.0 | Marzo 2026

Derechos reservados - Longevity Clinic SA de CV

---

## 1. Resumen Ejecutivo

Este documento describe la infraestructura tecnologica necesaria para escalar Longevity IA a **1,000 analisis simultaneos**, equivalente a **10,000-50,000 pacientes activos por mes**. Incluye arquitectura de sistemas, componentes tecnologicos, estimacion de costos y roadmap de implementacion.

### Metricas objetivo

| Metrica | Valor |
|---------|-------|
| Analisis simultaneos | 1,000 |
| Pacientes activos/mes | 10,000 - 50,000 |
| Tiempo maximo por analisis | 3-5 minutos |
| Disponibilidad (uptime) | 99.9% |
| Latencia API (CRUD) | < 200ms |
| Datos de monitoreo/paciente/dia | hasta 1,440 puntos (1/min) |
| Almacenamiento PDFs/mes | ~500 GB |
| Retencion de datos | 10 anos |

---

## 2. Arquitectura Actual vs Arquitectura Escalada

### 2.1 Arquitectura actual (MVP)

| Componente | Tecnologia | Limite |
|------------|------------|--------|
| Frontend + Backend | Vercel Serverless (Next.js) | 10-50 funciones simultaneas |
| Base de datos | Supabase Free/Pro (PostgreSQL) | 60-200 conexiones |
| Storage | Supabase Storage | 1-8 GB |
| IA | Anthropic API (Claude Sonnet) Tier 1 | ~50 req/min |
| Cola de trabajo | No existe | Analisis bloqueante en HTTP request |

**Limite real: 3-5 analisis simultaneos.**

### 2.2 Arquitectura escalada (1,000 simultaneos)

| Componente | Tecnologia | Capacidad |
|------------|------------|-----------|
| Frontend | Vercel Pro + Cloudflare CDN | Ilimitado (estatico + edge) |
| API Gateway | Vercel Pro (rutas ligeras) | 1,000+ req/s |
| Cola de trabajos | AWS SQS o BullMQ + Redis | 100,000+ mensajes en cola |
| Workers de analisis | AWS ECS Fargate o Google Cloud Run | 50-100 contenedores auto-scaling |
| Base de datos | AWS RDS PostgreSQL + PgBouncer | 5,000+ conexiones efectivas |
| Cache | Redis (ElastiCache o Upstash) | 100,000+ keys |
| Storage archivos | AWS S3 | Ilimitado |
| Storage tiempo real | Supabase Realtime o Pusher | 10,000+ conexiones WebSocket |
| IA | Anthropic API Tier 4 | 4,000 req/min |
| Monitoreo | Datadog + Sentry + PagerDuty | Alertas en tiempo real |
| CDN | Cloudflare Pro | Cache global, DDoS protection |

---

## 3. Diagrama de Arquitectura

```
                    USUARIOS (Web + Mobile)
                           |
                    [Cloudflare CDN]
                           |
                    [Vercel Edge Network]
                    Next.js Frontend SSR
                    API Routes (ligeras)
                           |
            +--------------+--------------+
            |              |              |
    [Auth Service]  [API Gateway]  [WebSocket]
    Supabase Auth   Vercel API     Supabase Realtime
            |              |              |
            |     +--------+--------+     |
            |     |                 |     |
      [Redis Cache]          [SQS / BullMQ]
      - Sesiones             - Cola analisis
      - Rate limiting        - Cola monitoreo
      - Cache resultados     - Cola alertas
            |                      |
            |          +-----------+-----------+
            |          |           |           |
            |    [Worker Pool - ECS Fargate / Cloud Run]
            |    |  Worker 1  |  Worker 2  | ... Worker N  |
            |    |  Analisis  |  Analisis  |    Analisis   |
            |    +-----+------+-----+------+------+--------+
            |          |            |             |
            |    [Anthropic API - Claude Sonnet - Tier 4]
            |    4,000 req/min | 1M+ tokens/min
            |          |
      +-----+----------+-----+
      |                       |
  [PostgreSQL RDS]      [AWS S3]
  + PgBouncer           PDFs, imagenes
  5,000+ conexiones     lab results
  Multi-AZ replica      lifecycle policies
      |
  [Monitoring Engine]
  Cron cada 5 min
  Alertas automaticas
  Re-analisis por triggers
```

---

## 4. Componentes Detallados

### 4.1 Frontend y API Gateway

**Tecnologia:** Vercel Pro + Next.js 14 App Router

- Frontend SSR con cache ISR (Incremental Static Regeneration)
- API routes para operaciones ligeras: CRUD pacientes, auth, webhooks
- NO ejecuta analisis de IA (delegado a workers)
- Edge Functions para rate limiting y validacion

**Capacidad:** 1,000+ requests/segundo sin degradacion.

### 4.2 Cola de Trabajos

**Tecnologia:** AWS SQS (serverless) o BullMQ + Redis (self-managed)

| Opcion | Ventaja | Desventaja |
|--------|---------|------------|
| AWS SQS | Serverless, sin mantenimiento, escala infinita | Latencia ~50-100ms, menos control |
| BullMQ + Redis | Control total, prioridades, retry, dashboard | Requiere mantener Redis |

**Recomendacion:** AWS SQS para simplicidad a escala, BullMQ para control granular.

**Tipos de cola:**
- `analysis-queue` — analisis completos de biomarcadores (prioridad alta)
- `partial-reanalysis-queue` — re-analisis parciales (prioridad media)
- `monitoring-queue` — ingesta de datos de monitoreo (prioridad baja)
- `alerts-queue` — evaluacion de alertas (prioridad alta)
- `dead-letter-queue` — trabajos fallidos para reintentar

### 4.3 Workers de Analisis

**Tecnologia:** AWS ECS Fargate (contenedores serverless) o Google Cloud Run

**Configuracion por worker:**
- 2 vCPU, 4 GB RAM
- Node.js 20 runtime
- Timeout: 10 minutos
- Health check cada 30 segundos

**Auto-scaling:**

| Metrica | Escala arriba | Escala abajo |
|---------|---------------|--------------|
| Mensajes en cola | > 10 por worker | < 2 por worker |
| CPU | > 70% | < 20% |
| Workers minimos | 5 (siempre encendidos) | - |
| Workers maximos | 100 | - |

**Calculo de workers para 1,000 simultaneos:**
- Cada analisis toma ~3-5 min (2 llamadas a Claude)
- Cada worker procesa 1 analisis a la vez (I/O bound, espera respuesta Claude)
- Para 1,000 simultaneos: **1,000 workers necesarios en pico**
- Promedio sostenido: 50-100 workers con cola absorbiendo picos

**Realidad:** El cuello de botella es Anthropic API (4,000 req/min en Tier 4). Con 2 llamadas por analisis:
- Maximo teorico: 2,000 analisis/min = ~33/segundo
- Para 1,000 simultaneos con 3 min cada uno: necesitas 1,000 slots de Claude activos
- **Solucion:** Anthropic Enterprise plan o modelo self-hosted (ver seccion 4.8)

### 4.4 Base de Datos

**Tecnologia:** AWS RDS PostgreSQL 16 + PgBouncer

**Instancia recomendada:**

| Parametro | Valor |
|-----------|-------|
| Tipo instancia | db.r6g.xlarge (4 vCPU, 32 GB RAM) |
| Storage | 500 GB gp3 SSD (escalable) |
| Multi-AZ | Si (replica sincrona en otra zona) |
| Read replicas | 1-2 (para queries de lectura pesadas) |
| PgBouncer pool | 5,000 conexiones logicas → 200 reales |
| Backups | Automaticos diarios, retencion 30 dias |
| Encryption | AES-256 at rest, TLS in transit |

**Tablas nuevas para escala:**

```
patients              ~50,000 registros/ano
lab_results           ~120,000 registros/ano (2-3 por paciente)
patient_monitoring    ~500M registros/ano (datos wearables)
monitoring_alerts     ~1M registros/ano
analysis_jobs         ~120,000 registros/ano (tracking de trabajos)
```

**Particionamiento para patient_monitoring:**
- Particion por mes (patient_monitoring_2026_01, _02, etc.)
- Indices en (patient_id, recorded_at DESC)
- Politica de compresion: datos > 1 ano → archivados a S3 Glacier

### 4.5 Cache (Redis)

**Tecnologia:** AWS ElastiCache Redis o Upstash Redis

**Uso:**
- Cache de sesiones de usuario (TTL 24h)
- Cache de resultados de analisis recientes (TTL 1h)
- Rate limiting por usuario (10 analisis/hora)
- Cache de busquedas PubMed/Semantic Scholar (TTL 7 dias)
- Contadores de trabajos en cola (metricas en tiempo real)

**Instancia:** cache.r6g.large (2 vCPU, 13 GB RAM), cluster mode

### 4.6 Almacenamiento de Archivos

**Tecnologia:** AWS S3

| Clase de storage | Uso | Costo/GB/mes |
|-----------------|-----|--------------|
| S3 Standard | PDFs/imagenes < 90 dias | $0.023 |
| S3 Infrequent Access | PDFs 90 dias - 1 ano | $0.0125 |
| S3 Glacier | PDFs > 1 ano (archivo legal) | $0.004 |

**Lifecycle policy automatica:** Standard → IA a 90 dias → Glacier a 365 dias.

**Estimacion de volumen:**
- 50,000 pacientes × 2.5 analisis/ano × 3 archivos × 2 MB = ~750 GB/ano
- Con lifecycle: costo efectivo ~$10-15/mes

### 4.7 Monitoreo Continuo del Paciente

**Fuentes de datos soportadas:**

| Dispositivo | API | Datos | Frecuencia |
|------------|-----|-------|------------|
| Apple Watch / iPhone | HealthKit (via app nativa) | HR, pasos, sueno, VO2max, HRV, SpO2 | Cada 1-5 min |
| Oura Ring | Oura Cloud API v2 | Sueno, HRV, temperatura, readiness | Cada 5 min |
| Dexcom CGM | Dexcom API v3 | Glucosa continua | Cada 5 min |
| Withings | Withings Health Mate API | Peso, presion arterial, composicion | Por evento |
| Garmin | Garmin Connect API | VO2max, estres, pasos, sueno | Cada 15 min |
| Freestyle Libre | LibreLinkUp API | Glucosa continua | Cada 1 min |
| Manual (app) | REST API interno | Presion, sintomas, medicamentos | Por evento |

**Motor de alertas:**

- Cron job cada 5 minutos evalua ultimas lecturas vs umbrales
- Umbrales personalizables por paciente y por medico
- Niveles: informativo → atencion → alerta → critico
- Notificaciones: push notification (app), email, SMS (criticos), webhook a medico

**Triggers de re-analisis automatico:**

| Condicion | Accion |
|-----------|--------|
| Glucosa promedio 7 dias > 140 mg/dL | Re-analisis metabolico parcial |
| HR reposo tendencia ascendente 14 dias | Re-analisis cardiovascular parcial |
| Sueno < 5h promedio 7 dias | Alerta neuroproteccion |
| Peso delta > 5 kg en 30 dias | Re-analisis completo |
| SpO2 < 92% sostenido | Alerta critica inmediata |

### 4.8 Inteligencia Artificial — Anthropic Claude

**Tier actual vs requerido:**

| Tier | Rate limit | Costo tokens | Analisis simultaneos |
|------|-----------|--------------|---------------------|
| Tier 1 (actual) | 50 req/min | $3/$15 per 1M tokens | ~5 |
| Tier 2 | 1,000 req/min | $3/$15 per 1M tokens | ~100 |
| Tier 3 | 2,000 req/min | $3/$15 per 1M tokens | ~200 |
| Tier 4 | 4,000 req/min | $3/$15 per 1M tokens | ~500 |
| Enterprise | Custom | Volumen negociado | 1,000+ |

**Para 1,000 simultaneos se requiere Anthropic Enterprise o una de estas alternativas:**

| Alternativa | Ventaja | Desventaja |
|-------------|---------|------------|
| Anthropic Enterprise plan | Sin rate limits, SLA, soporte dedicado | Costo negociado (~$10K+/mes) |
| Multi-modelo failover | Claude primario + GPT-4o fallback | Prompts diferentes por modelo |
| Modelo self-hosted (Llama 3.1 405B) | Sin rate limits, costo fijo | Menor calidad, requiere GPUs |
| Batch API | 50% descuento, 24h SLA | No sirve para tiempo real |

**Recomendacion:** Anthropic Enterprise para analisis en tiempo real + Batch API para re-analisis nocturnos masivos.

**Tokens por analisis:**

| Fase | Input tokens | Output tokens | Costo (Sonnet) |
|------|-------------|---------------|----------------|
| Extraccion biomarcadores | ~8,000 | ~3,000 | $0.039 |
| Analisis IA completo | ~12,000 | ~8,000 | $0.156 |
| Re-analisis parcial | ~8,000 | ~4,000 | $0.084 |
| **Total por analisis completo** | **~20,000** | **~11,000** | **~$0.195** |

---

## 5. Seguridad y Compliance

### 5.1 Datos sensibles de salud

| Requisito | Implementacion |
|-----------|---------------|
| HIPAA (EE.UU.) | BAA con AWS, encriptacion AES-256, audit logs |
| LFPDPPP (Mexico) | Aviso de privacidad, consentimiento explicito, derecho ARCO |
| GDPR (Europa) | Data residency EU, right to erasure, DPO |
| Encriptacion at rest | AES-256 en RDS, S3, Redis |
| Encriptacion in transit | TLS 1.3 en todas las conexiones |
| Audit logs | Todas las operaciones de lectura/escritura de datos medicos |
| Acceso basado en roles | RLS en PostgreSQL + middleware en API |
| Backups encriptados | AWS KMS, retencion 30 dias, cross-region |

### 5.2 Aislamiento multi-tenant

Para multiples clinicas:
- Row Level Security (RLS) a nivel de base de datos
- Tenant ID en cada tabla
- API keys por clinica
- Opcion de base de datos dedicada para hospitales (compliance estricto)

---

## 6. Estimacion de Costos Mensual

### 6.1 Escenario: 10,000 pacientes/mes, pico 1,000 simultaneos

| Componente | Servicio | Especificacion | Costo/mes USD |
|------------|----------|----------------|---------------|
| Frontend | Vercel Pro | Next.js SSR + Edge | $20 |
| CDN | Cloudflare Pro | Cache + DDoS + WAF | $20 |
| API Workers | AWS ECS Fargate | 5 base + auto-scale hasta 100 | $800 - $2,500 |
| Base de datos | AWS RDS PostgreSQL | db.r6g.xlarge Multi-AZ | $600 |
| Read replica | AWS RDS | db.r6g.large | $300 |
| PgBouncer | EC2 t3.small | Connection pooler | $15 |
| Cache | ElastiCache Redis | cache.r6g.large | $200 |
| Cola | AWS SQS | ~5M mensajes/mes | $5 |
| Storage archivos | AWS S3 | ~500 GB Standard + lifecycle | $15 |
| IA - Claude | Anthropic Enterprise | ~10,000 analisis × $0.20 | $2,000 |
| IA - Claude batch | Anthropic Batch API | ~5,000 re-analisis × $0.10 | $500 |
| Monitoreo infra | Datadog | APM + Logs + Infra | $200 |
| Error tracking | Sentry | Business plan | $80 |
| Alertas | PagerDuty | Starter | $20 |
| Email transaccional | Resend o SendGrid | ~50,000 emails | $20 |
| Push notifications | Firebase FCM | Ilimitado | $0 |
| DNS | Cloudflare | Incluido en Pro | $0 |
| SSL | Cloudflare + AWS ACM | Incluido | $0 |
| **TOTAL** | | | **$4,795 - $6,495** |

### 6.2 Escenario: 50,000 pacientes/mes, pico 1,000 simultaneos

| Componente | Cambio | Costo/mes USD |
|------------|--------|---------------|
| API Workers | Auto-scale hasta 200 | $2,500 - $5,000 |
| Base de datos | db.r6g.2xlarge Multi-AZ | $1,200 |
| Read replicas | 2 × db.r6g.large | $600 |
| Cache | cache.r6g.xlarge cluster | $400 |
| Storage | ~2 TB | $50 |
| IA - Claude | ~50,000 analisis × $0.20 | $10,000 |
| IA - Claude batch | ~25,000 re-analisis × $0.10 | $2,500 |
| Monitoreo | Datadog Pro | $500 |
| **TOTAL** | | **$17,770 - $20,270** |

### 6.3 Analisis de rentabilidad

| Suscripcion paciente | Pacientes/mes | Ingreso mensual | Costo infra | Margen |
|---------------------|---------------|-----------------|-------------|--------|
| $15 USD/mes (basico) | 10,000 | $150,000 | $6,500 | 95.7% |
| $30 USD/mes (premium) | 10,000 | $300,000 | $6,500 | 97.8% |
| $15 USD/mes (basico) | 50,000 | $750,000 | $20,000 | 97.3% |
| $50 USD/mes (clinica) | 50,000 | $2,500,000 | $20,000 | 99.2% |

---

## 7. Roadmap de Implementacion

### Fase 1 — Colas de trabajo y workers (Semana 1-4)

**Objetivo:** Pasar de 5 a 100+ analisis simultaneos.

- Implementar AWS SQS o BullMQ + Redis
- Crear imagen Docker del worker de analisis
- Migrar logica de analisis de Vercel serverless a workers ECS
- Implementar webhook de notificacion al completar
- Frontend: polling o Supabase Realtime para estado del analisis

**Entregable:** Analisis asincrono funcionando, sin timeout de 5 min.

### Fase 2 — Base de datos dedicada (Semana 3-6)

**Objetivo:** Soportar 5,000+ conexiones y queries pesadas.

- Provisionar RDS PostgreSQL Multi-AZ
- Configurar PgBouncer
- Migrar datos de Supabase a RDS
- Implementar read replicas para queries de lectura
- Configurar backups automaticos y encriptacion

**Entregable:** Base de datos escalable con failover automatico.

### Fase 3 — Monitoreo continuo (Semana 5-10)

**Objetivo:** Ingesta de datos de wearables y monitoreo proactivo.

- Crear tablas patient_monitoring y monitoring_alerts
- Implementar API de ingesta (REST + WebSocket)
- Integrar Oura Ring API y Apple HealthKit
- Motor de alertas (cron cada 5 min)
- Dashboard de monitoreo en tiempo real para el paciente

**Entregable:** Datos de wearables fluyendo y alertas automaticas.

### Fase 4 — Auto-scaling y optimizacion (Semana 8-12)

**Objetivo:** Escalar a 1,000 simultaneos con costos controlados.

- Configurar auto-scaling de workers por metrica de cola
- Implementar cache de resultados frecuentes en Redis
- Optimizar queries con indices y particionamiento
- Negociar Anthropic Enterprise plan
- Implementar Batch API para re-analisis nocturnos

**Entregable:** 1,000 analisis simultaneos sostenidos.

### Fase 5 — App movil y wearables (Semana 10-16)

**Objetivo:** Experiencia completa de monitoreo.

- App React Native (iOS + Android)
- Integracion nativa con HealthKit y Google Health Connect
- Push notifications para alertas
- Sincronizacion offline de datos de monitoreo
- Dexcom y Freestyle Libre integrados

**Entregable:** App movil publicada en App Store y Google Play.

### Fase 6 — Compliance y enterprise (Semana 14-20)

**Objetivo:** Listo para hospitales y clinicas grandes.

- Auditoria HIPAA
- Implementar audit logs completos
- Aislamiento multi-tenant por clinica
- SSO (SAML/OIDC) para hospitales
- API publica para integraciones con EMR (Epic, Cerner)
- Documentacion de API para desarrolladores terceros

**Entregable:** Certificacion HIPAA, API publica, integraciones EMR.

---

## 8. Equipo Requerido

| Rol | Cantidad | Responsabilidad |
|-----|----------|-----------------|
| Tech Lead / CTO | 1 | Arquitectura, decisiones tecnicas, code review |
| Backend Engineer (Senior) | 2 | Workers, colas, base de datos, APIs |
| Frontend Engineer | 1 | Dashboard, app web, optimizaciones |
| Mobile Engineer | 1 | App React Native, integraciones wearables |
| DevOps / SRE | 1 | Infraestructura AWS, CI/CD, monitoreo, seguridad |
| Data Engineer | 1 | Pipeline de monitoreo, particionamiento, analytics |
| QA Engineer | 1 | Testing automatizado, load testing, seguridad |
| Product Manager | 1 | Roadmap, prioridades, stakeholders |
| **Total** | **9** | |

**Costo estimado equipo (Mexico):**
- Salario promedio senior: $45,000 - $65,000 MXN/mes
- Equipo completo (9): ~$450,000 - $585,000 MXN/mes (~$25,000 - $32,500 USD/mes)

---

## 9. Stack Tecnologico Completo

| Capa | Tecnologia |
|------|-----------|
| Lenguaje | TypeScript (frontend + backend + workers) |
| Framework | Next.js 14 (App Router) |
| Runtime | Node.js 20 LTS |
| Base de datos | PostgreSQL 16 (AWS RDS) |
| Connection pooler | PgBouncer |
| Cache | Redis 7 (ElastiCache) |
| Cola de mensajes | AWS SQS o BullMQ |
| Contenedores | Docker + AWS ECS Fargate |
| Storage | AWS S3 + Cloudflare CDN |
| Auth | Supabase Auth (JWT + RLS) |
| IA | Anthropic Claude Sonnet (Enterprise) |
| APIs medicas | PubMed E-utilities, Semantic Scholar, OpenAlex |
| Frontend UI | React 18 + Tailwind CSS + Recharts |
| Mobile | React Native (Expo) |
| Monitoreo | Datadog APM + Logs + Infra |
| Error tracking | Sentry |
| CI/CD | GitHub Actions + Vercel |
| DNS + CDN | Cloudflare Pro |
| Email | Resend o SendGrid |
| Push | Firebase Cloud Messaging |

---

## 10. Metricas de Exito (KPIs)

| KPI | Objetivo | Herramienta |
|-----|----------|-------------|
| Analisis simultaneos | 1,000 sostenidos | Datadog + metricas cola |
| Tiempo de analisis | < 5 min (P95) | Datadog APM |
| Disponibilidad | 99.9% uptime | Datadog + PagerDuty |
| Latencia API | < 200ms (P95) | Datadog APM |
| Error rate | < 0.1% | Sentry |
| Costo por analisis | < $0.25 USD | AWS Cost Explorer |
| Satisfaccion paciente | > 4.5/5 | Encuestas in-app |
| Retencion mensual | > 85% | Analytics |
| Alertas de monitoreo | < 5 min deteccion | Motor de alertas interno |

---

*Documento generado por Longevity IA v2.0*

*Derechos reservados - Longevity Clinic SA de CV*
