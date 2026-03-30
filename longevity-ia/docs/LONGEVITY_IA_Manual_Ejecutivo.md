# LONGEVITY IA — Manual Ejecutivo

**Plataforma de Inteligencia Artificial para Medicina de Longevidad**
Version 2.0 | Marzo 2026

---

## TABLA DE CONTENIDO

1. Resumen Ejecutivo
2. Justificacion de Mercado
3. Modelo de Negocio por Suscripcion
4. Manual de Usuario
   - 4.1 Paciente
   - 4.2 Medico
   - 4.3 Clinica
5. Manual del Desarrollador
   - 5.1 Arquitectura del Sistema
   - 5.2 Stack Tecnologico
   - 5.3 Estructura de Archivos
   - 5.4 Base de Datos (Supabase)
   - 5.5 Motor de Analisis IA
   - 5.6 Catalogo de Biomarcadores
   - 5.7 Sistema de Cache
   - 5.8 Flujo de Datos Completo
   - 5.9 Seguridad y RLS
   - 5.10 Variables de Entorno

---

## 1. RESUMEN EJECUTIVO

Longevity IA es una plataforma SaaS de analisis medico impulsada por inteligencia artificial que transforma estudios de laboratorio (PDF/imagen) en dashboards clinicos interactivos con protocolo personalizado de longevidad.

**Propuesta de valor unica:** El paciente sube su estudio de laboratorio y en segundos obtiene un dashboard visual con semaforos de biomarcadores. En 2-5 minutos, la IA genera un analisis clinico completo que incluye FODA medica, perfil de riesgo, protocolo farmacologico personalizado con 120+ moleculas, proyeccion a 10 anos y calculo de celulas madre.

**Diferenciadores clave:**
- Analisis basado en rangos de medicina de longevidad (no rangos de laboratorio convencionales)
- Protocolo personalizado con evidencia cientifica de 39 instituciones de investigacion
- Dashboard instantaneo (segundos) + analisis profundo IA (minutos)
- Sistema multi-rol: paciente, medico y clinica
- Vinculacion segura paciente-medico por codigo unico
- Chatbot conversacional que extrae historia clinica automaticamente
- Catalogo de 133 biomarcadores con rangos por genero y edad

---

## 2. JUSTIFICACION DE MERCADO

### 2.1 Mercado Actual de Software de Analisis Medicos

El mercado global de software de analisis clinicos esta valuado en USD 3.2B (2025) con crecimiento proyectado de 12.4% CAGR hasta 2030 (Grand View Research). Los principales drivers son:

- Envejecimiento poblacional global
- Demanda de medicina preventiva y personalizada
- Adopcion de IA en diagnostico medico
- Telemedicina post-COVID

### 2.2 Competidores y Posicionamiento

| Plataforma | Enfoque | Limitacion | Ventaja Longevity IA |
|-----------|---------|------------|---------------------|
| InsideTracker | Biomarcadores + nutricion | Solo EEUU, sin protocolo farmacologico | Protocolo con 120+ moleculas + celulas madre |
| SiPhox | Panel de longevidad | Solo kit propio, sin analisis de PDF externos | Acepta cualquier laboratorio (PDF/imagen) |
| Function Health | 100+ biomarcadores/ano | USD $499/ano, sin IA clinica profunda | FODA + riesgo + proyeccion + protocolo personalizado |
| Blueprint (Bryan Johnson) | Protocolo anti-aging | Un solo protocolo generico | Hiperpersonalizacion por historia clinica |
| Laboratorios convencionales | Rangos de referencia | Solo "normal/alto/bajo" sin contexto | Rangos de longevidad + interpretacion IA |

### 2.3 Oportunidad de Mercado en LATAM

- 660M personas en Latinoamerica
- Crecimiento de 23% en telesalud post-COVID (BID 2024)
- Sin competidor directo en medicina de longevidad con IA en espanol
- Primer motor en espanol mexicano para analisis de biomarcadores

---

## 3. MODELO DE NEGOCIO POR SUSCRIPCION

### 3.1 Planes de Suscripcion

#### Plan Paciente
- Dashboard de salud personalizado
- Analisis de biomarcadores con IA
- Protocolo de longevidad individual
- Historial de estudios y comparativas
- Chat con Longevity IA
- Vinculacion con medicos por codigo

#### Plan Medico
- Gestion de multiples pacientes vinculados
- Reportes medicos PDF profesionales
- Protocolo con evidencia cientifica
- Algoritmo de celulas madre y exosomas
- Re-analisis con historia clinica
- Exportacion de datos clinicos
- Panel de invitaciones de pacientes

#### Plan Clinica
- Todo lo del Plan Medico incluido
- Panel de administracion de medicos
- Estadisticas de la clinica
- Marca personalizada en reportes
- Soporte prioritario
- Integracion con sistemas hospitalarios

### 3.2 Metricas Clave del Modelo

- **Costo por analisis IA:** ~USD $0.15-0.40 (tokens Claude Sonnet)
- **Costo por re-analisis parcial:** ~USD $0.05-0.12 (cache parcial)
- **Costo por analisis cacheado (mismo archivo):** ~USD $0.00
- **Retencion esperada:** Pacientes con condiciones cronicas requieren analisis cada 3-6 meses

---

## 4. MANUAL DE USUARIO

### 4.1 Paciente

#### 4.1.1 Registro
1. Ir a la pagina principal (/)
2. En la seccion "Planes", hacer clic en "Ingresar" debajo de "Persona"
3. Completar: nombre completo, correo electronico, contrasena
4. La cuenta se crea inmediatamente

#### 4.1.2 Crear Perfil
1. Al iniciar sesion por primera vez, se redirige a Onboarding
2. Completar: nombre, edad, genero, peso (opcional), estatura (opcional)
3. Se genera automaticamente un codigo de paciente (ej: LNG-M1X2K3-ABC)

#### 4.1.3 Subir Estudio de Laboratorio
1. En la pantalla principal, hacer clic en "Nuevo Estudio"
2. Arrastrar o seleccionar archivo PDF o imagen (JPG, PNG, WEBP)
3. Seleccionar la fecha del estudio
4. Hacer clic en "Analizar con IA"
5. **Fase 1 (30-60 segundos):** Extraccion de biomarcadores
6. **Redireccion automatica:** Dashboard instantaneo con semaforos de color
7. **Fase 2 (2-5 minutos en segundo plano):** Analisis IA completo
8. Cuando la IA termina, aparece boton "Ver Analisis IA Completo"

#### 4.1.4 Dashboard de Salud
El dashboard tiene 11 pestanas:

| Pestana | Contenido |
|---------|-----------|
| Resumen | Score de longevidad, edad biologica, resumen ejecutivo, alertas clave, salud de organos |
| FODA Medica | Fortalezas, Debilidades, Oportunidades, Amenazas con evidencia cientifica |
| Lipidos | Perfil lipidico completo con graficos (CT, LDL, HDL, TG, VLDL, ratios) |
| Metabolico | Glucosa, insulina, HOMA-IR, funcion renal, acido urico |
| Proyeccion | Grafico de proyeccion a 10 anos con/sin protocolo, factores de riesgo |
| Protocolo | 8-12 intervenciones personalizadas con molecula, dosis, mecanismo, evidencia |
| Organos | Scores por sistema organico con diagrama de red |
| Comparar | Comparativa temporal entre multiples analisis |
| Estudio | Archivo original del laboratorio |
| Celulas Madre | Calculo personalizado de dosis MSC y exosomas |
| Historia Clinica | Visualizacion de datos clinicos recopilados |

#### 4.1.5 Chat con Longevity IA
- Disponible como boton flotante en el dashboard
- El paciente puede hacer preguntas sobre sus resultados
- El chatbot extrae automaticamente informacion clinica de la conversacion
- Los datos de salud se guardan automaticamente en la historia clinica
- Soporta: alergias, dieta, ejercicio, sueno, medicamentos, historial familiar

#### 4.1.6 Conectar con Medico
1. En la pantalla de "Mis Analisis", hacer clic en "Mis Medicos"
2. Se muestra el codigo del paciente (para compartir)
3. Ingresar el codigo del medico (MED-XXXXXX)
4. Hacer clic en "Conectar"
5. El medico recibe una invitacion pendiente
6. Una vez aceptada, el medico puede ver los analisis

#### 4.1.7 Exportar Reporte PDF
- En el dashboard, usar los botones de exportacion
- Genera un PDF profesional con todos los hallazgos
- Incluye: resumen ejecutivo, FODA, protocolo, proyeccion, alertas

#### 4.1.8 Re-Analizar
- Boton "Re-analizar" disponible en el dashboard
- Util cuando se actualiza la historia clinica
- Re-analisis parcial (~1-1.5 min) si ya hay analisis previo
- Actualiza protocolo y proyeccion con la nueva informacion

---

### 4.2 Medico

#### 4.2.1 Registro
1. En la pagina principal, hacer clic en "Ingresar" debajo de "Medico"
2. Completar: nombre de usuario, correo, contrasena, nombre completo, especialidad, cedula profesional
3. Se genera automaticamente un codigo de medico (MED-XXXXXX)

#### 4.2.2 Codigo de Medico
- Al iniciar sesion, aparece un banner dorado con el codigo unico
- El medico comparte este codigo con sus pacientes
- Los pacientes usan el codigo para enviar invitaciones de vinculacion

#### 4.2.3 Invitaciones de Pacientes
1. Cuando un paciente envia invitacion, aparece un banner de notificacion
2. Hacer clic en "Invitaciones" para ver la lista
3. Cada invitacion muestra: nombre del paciente, codigo, edad, fecha
4. Opciones: Aceptar (acceso a analisis) o Rechazar

#### 4.2.4 Ver Analisis de Pacientes
- Los pacientes vinculados aparecen como tarjetas en la pantalla principal
- Cada tarjeta muestra: nombre, codigo, edad, score, alertas
- Hacer clic en "Dashboard" para ver el analisis completo
- El medico puede ver todas las pestanas excepto Historia Clinica
- El medico NO puede: subir estudios, re-analizar, ni acceder al chatbot

#### 4.2.5 Desvincular Paciente
- En la tarjeta del paciente, hacer clic en la "X"
- Confirmar desvinculacion
- Se revoca el acceso; el paciente puede re-invitar en el futuro
- Los datos del paciente NO se eliminan

#### 4.2.6 Restricciones del Medico
| Funcion | Acceso |
|---------|--------|
| Ver dashboard completo (10 pestanas) | Si |
| Exportar PDF | Si |
| Historia Clinica | No |
| Chatbot Longevity IA | No |
| Re-analizar | No |
| Subir nuevo estudio | No |

---

### 4.3 Clinica

#### 4.3.1 Registro
1. En la pagina principal, hacer clic en "Ingresar" debajo de "Clinica"
2. Completar: nombre de clinica, RFC, correo, contrasena, telefono, direccion, director

#### 4.3.2 Panel de Clinica
- Panel placeholder con informacion de la clinica
- Funciones proximamente: gestion de medicos, pacientes, estadisticas, reportes, configuracion

---

## 5. MANUAL DEL DESARROLLADOR

### 5.1 Arquitectura del Sistema

```
[Navegador del Usuario]
       |
       v
[Next.js 14 App Router] ── SSR/SSG + API Routes
       |          |
       v          v
[Supabase]    [Claude AI API]
  - Auth         - Sonnet 4.6
  - PostgreSQL   - 64K max tokens
  - Storage      - Streaming SSE
  - RLS
```

**Patron arquitectonico:** Arquitectura serverless con Next.js App Router. Las API routes se ejecutan como funciones serverless en Vercel con limite de 300s para analisis largos.

**Flujo de datos principal:**
1. Frontend (React) -> API Route (Next.js serverless)
2. API Route -> Supabase (datos) + Claude API (analisis)
3. Respuesta via Server-Sent Events (SSE) para progreso en tiempo real

---

### 5.2 Stack Tecnologico

| Capa | Tecnologia | Version | Proposito |
|------|-----------|---------|-----------|
| Frontend | Next.js | 14.2.18 | Framework React con SSR |
| UI | Tailwind CSS | 3.4.1 | Estilos utilitarios |
| Iconos | Lucide React | 0.460.0 | Libreria de iconos |
| Graficos | Recharts | 2.13.3 | Visualizacion de datos |
| Toast | Sonner | 1.7.1 | Notificaciones |
| Estado | Zustand | 5.0.1 | Estado global ligero |
| IA | Anthropic SDK | 0.36.3 | Claude Sonnet 4.6 |
| Base de datos | Supabase | 2.45.4 | PostgreSQL + Auth + Storage |
| PDF lectura | pdf-parse | 1.1.1 | Extraccion de texto de PDF |
| PDF generacion | jsPDF | 2.5.2 | Generacion de reportes |
| Captura | html2canvas | 1.4.1 | Screenshots del dashboard |
| Upload | react-dropzone | 14.3.5 | Drag & drop de archivos |
| Lenguaje | TypeScript | 5 | Tipado estatico |

---

### 5.3 Estructura de Archivos

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing page (/)
│   ├── login/page.tsx            # Autenticacion
│   ├── onboarding/page.tsx       # Creacion de perfil
│   ├── patients/
│   │   ├── page.tsx              # Lista de pacientes (multi-rol)
│   │   └── [id]/
│   │       ├── page.tsx          # Detalle de paciente
│   │       ├── dashboard/page.tsx # Dashboard de analisis
│   │       ├── upload/page.tsx   # Subir estudio
│   │       └── intake/page.tsx   # Historia clinica
│   ├── api/
│   │   ├── analyze/route.ts      # Motor de analisis (2 fases)
│   │   ├── chat/route.ts         # Chat streaming con IA
│   │   ├── patients/             # CRUD pacientes
│   │   ├── results/[id]/         # Resultados + re-analisis
│   │   └── medico/invitations/   # Invitaciones medico
│   └── globals.css               # Estilos globales + animaciones
│
├── components/
│   ├── auth/RegisterModal.tsx    # Registro por rol
│   ├── clinica/ClinicaDashboard  # Panel clinica
│   ├── dashboard/
│   │   ├── DashboardTabs.tsx     # Orquestador de 11 pestanas
│   │   ├── InstantDashboard.tsx  # Dashboard instantaneo (Fase 2)
│   │   ├── LongevityChat.tsx     # Chatbot conversacional
│   │   ├── ExportButtons.tsx     # Exportacion PDF/imagen
│   │   └── tabs/                 # 12 componentes de pestana
│   ├── medico/InvitationsPanel   # Panel de invitaciones
│   ├── patients/
│   │   ├── PatientCard.tsx       # Tarjeta de paciente (multi-rol)
│   │   ├── AnalysisCards.tsx     # Tarjetas de analisis por fecha
│   │   ├── MedicoLinksPanel.tsx  # Vinculacion con medicos
│   │   └── NewPatientModal.tsx   # Crear paciente
│   ├── ui/                       # Componentes UI reutilizables
│   └── upload/FileUploader.tsx   # Componente de carga de archivos
│
├── lib/
│   ├── anthropic/analyzer.ts     # Motor IA (prompts + llamadas a Claude)
│   ├── biomarker-ranges.ts       # Catalogo de 133 biomarcadores
│   ├── pdf-report.ts             # Generador de PDF programatico
│   ├── supabase/
│   │   ├── client.ts             # Cliente browser (singleton lazy)
│   │   ├── server.ts             # Cliente servidor (request/component)
│   │   └── queries.ts            # Esquema de referencia
│   └── utils.ts                  # Utilidades centralizadas
│
├── types/index.ts                # Definiciones TypeScript
└── middleware.ts                  # Auth guard + session refresh
```

---

### 5.4 Base de Datos (Supabase)

#### Tablas Principales

**patients**
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | UUID PK | Identificador unico |
| user_id | UUID FK -> auth.users | Vinculo con cuenta |
| name | TEXT | Nombre del paciente |
| code | TEXT UNIQUE | Codigo unico (LNG-XXXXX) |
| age | INTEGER | Edad |
| gender | TEXT | male/female/other |
| weight | DECIMAL | Peso en kg |
| height | DECIMAL | Estatura en cm |
| clinical_history | JSONB | Historia clinica (9 secciones) |
| notes | TEXT | Notas adicionales |
| created_at | TIMESTAMPTZ | Fecha de creacion |

**lab_results**
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | UUID PK | Identificador unico |
| patient_id | UUID FK -> patients | Paciente asociado |
| result_date | DATE | Fecha del estudio |
| file_urls | TEXT[] | URLs de archivos en storage |
| parsed_data | JSONB | Biomarcadores extraidos (7 categorias) |
| ai_analysis | JSONB | Analisis IA completo (10 secciones) |
| created_at | TIMESTAMPTZ | Fecha de creacion |

**medicos**
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | UUID PK | Identificador unico |
| user_id | UUID FK -> auth.users | Vinculo con cuenta |
| code | TEXT UNIQUE | Codigo de medico (MED-XXXXXX) |
| full_name | TEXT | Nombre completo |
| specialty | TEXT | Especialidad medica |
| license_number | TEXT | Cedula profesional |
| email | TEXT | Correo electronico |

**clinicas**
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | UUID PK | Identificador unico |
| user_id | UUID FK -> auth.users | Vinculo con cuenta |
| clinic_name | TEXT | Nombre de la clinica |
| rfc | TEXT | RFC fiscal |
| contact_email | TEXT | Correo de contacto |
| phone | TEXT | Telefono |
| address | TEXT | Direccion |
| director_name | TEXT | Director medico |

**patient_medico_links**
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | UUID PK | Identificador unico |
| patient_id | UUID FK -> patients | Paciente |
| medico_user_id | UUID FK -> auth.users | Medico |
| medico_email | TEXT | Email del medico |
| status | TEXT | pending / active / revoked |
| invited_at | TIMESTAMPTZ | Fecha de invitacion |
| confirmed_at | TIMESTAMPTZ | Fecha de confirmacion |

#### Row Level Security (RLS)

| Tabla | Politica | Regla |
|-------|----------|-------|
| patients | patients_own | user_id = auth.uid() (ALL) |
| medicos | medicos_read | Lectura abierta a autenticados |
| medicos | medicos_write | user_id = auth.uid() (INSERT) |
| medicos | medicos_update | user_id = auth.uid() (UPDATE) |
| patient_medico_links | links_read/insert/update | Abierto a autenticados (filtrado en codigo) |

---

### 5.5 Motor de Analisis IA

#### Archivo: `src/lib/anthropic/analyzer.ts`

**Modelo:** Claude Sonnet 4.6 (claude-sonnet-4-6)

#### Flujo de Analisis Completo

```
PDF/Imagen
    │
    ▼
[extractBiomarkers]          ← Llamada 1: Ligera (~30-60s)
    │  max_tokens: 8,000
    │  Extrae: 7 categorias de biomarcadores
    │  Output: ParsedData (JSON estructurado)
    │
    ▼
[GUARDAR parsed_data]        ← INSERT en lab_results
[ENVIAR evento 'extracted']  ← Redirect a dashboard instantaneo
    │
    ▼
[reanalyzeWithClinicalHistory]  ← Llamada 2: Pesada (~2-5 min)
    │  max_tokens: 64,000
    │  Input: parsedData + historia clinica + contexto paciente
    │  Output: AIAnalysis (10 secciones)
    │
    ▼
[GUARDAR ai_analysis]       ← UPDATE en lab_results
[ENVIAR evento 'done']
```

#### Prompt del Sistema (SYSTEM_PROMPT)

El prompt define a Longevity IA con conocimiento de:

**39 instituciones de investigacion:**
Harvard (Sinclair), Stanford, Buck Institute, Mayo Clinic, Karolinska, NIH/NIA, Baylor (GlyNAC), Altos Labs, SENS Foundation, Salk Institute, MIT (Guarente), Brigham/VITAL Trial, Cleveland Clinic (ApoB), Washington University (NMN), Graz (spermidina), Johns Hopkins, Copenhagen (ejercicio), Weizmann (microbioma), UCL (estres), Columbia (circadiano), Tufts, USC (Longo/FMD), y mas.

**10 Hallmarks del Envejecimiento (Lopez-Otin 2023):**
1. Inestabilidad genomica y acortamiento telomerico
2. Alteraciones epigeneticas (relojes de Horvath, GrimAge, PhenoAge)
3. Perdida de proteostasis (autofagia, UPS)
4. Desregulacion de nutrientes (mTOR/AMPK/IGF-1/insulina/sirtuinas)
5. Disfuncion mitocondrial (PGC-1alfa, mtDNA, ROS)
6. Senescencia celular e inflammaging (SASP, IL-6, TNF-alfa)
7. Agotamiento de celulas madre (nicho HSC)
8. Comunicacion intercelular alterada (exosomas, microbioma)
9. Inflamacion cronica de bajo grado (eje intestino-inmune)
10. Disfuncion macroautofagica (mTOR, espermidina)

#### Pool de Intervenciones (14 categorias, 120+ moleculas)

| # | Categoria | Moleculas | Ejemplos |
|---|-----------|:---------:|----------|
| 1 | Cardiovascular / Lipidos | 9 | Omega-3, Berberina, CoQ10, Nattokinasa |
| 2 | Metabolico / Glucosa | 8 | Metformina, Cromo, R-ALA, Canela Ceylon |
| 3 | Inflamacion / Inflammaging | 9 | GlyNAC, Curcumina, Sulforafano, Quercetina |
| 4 | Mitocondrial / NAD+ | 8 | NMN, NR, PQQ, Urolitina A |
| 5 | Vitaminas / Minerales | 12 | D3+K2, Magnesio, Zinc, Selenio, B12 |
| 6 | Hormonal / Endocrino | 8 | DHEA, Ashwagandha, Tongkat Ali, Melatonina |
| 7 | Neuroproteccion / Cognitivo | 8 | Mg L-Treonato, Lion's Mane, Bacopa, Rhodiola |
| 8 | Hepatoproteccion | 5 | NAC, Silimarina, TUDCA |
| 9 | Salud Intestinal / Microbioma | 7 | Probioticos, L-Glutamina, Tributirina |
| 10 | Inmunomodulacion | 5 | Beta-glucanos, Lactoferrina, Calostro |
| 11 | Senolitico / Anti-Aging | 6 | D+Q, Fisetin, Rapamicina, Spermidina |
| 12 | Medicina Regenerativa | 8 | MSC IV, Exosomas, PRP, BPC-157, GHK-Cu |
| 13 | Peptidos Terapeuticos | 8 | AOD-9604, TB-500, CJC-1295, Selank, SS-31 |
| 14 | Estilo de Vida | 7+ | Zona 2, HIIT, TRE, FMD, Sauna, Meditacion |

#### Output del Analisis IA (AIAnalysis)

```typescript
{
  systemScores: {
    cardiovascular: 0-100,
    metabolic: 0-100,
    hepatic: 0-100,
    renal: 0-100,
    immune: 0-100,
    hematologic: 0-100,
    inflammatory: 0-100,
    vitamins: 0-100
  },
  overallScore: 0-100,          // Score general de longevidad
  longevity_age: number,        // Edad biologica estimada
  clinicalSummary: string,      // Resumen ejecutivo personalizado
  keyAlerts: [{                 // Alertas de atencion inmediata
    title, description, level, value, target
  }],
  swot: {                       // FODA Medica
    strengths: [{item, detail, evidence}],   // 4+
    weaknesses: [{item, detail, evidence}],  // 3+
    opportunities: [{item, detail, evidence}], // 4+
    threats: [{item, detail, evidence}]      // 3+
  },
  risks: [{                     // Perfil de riesgo (4 enfermedades)
    disease, probability, horizon, drivers, color
  }],
  protocol: [{                  // Protocolo (8-12 intervenciones)
    number, category, molecule, dose, mechanism,
    evidence, clinicalTrial, targetBiomarkers,
    expectedResult, action, urgency
  }],
  projectionData: [{            // Proyeccion 10 anos
    year, withoutIntervention, withIntervention, yearRisk
  }],
  projectionFactors: [{         // 3 factores clave
    factor, currentValue, optimalValue,
    medicalJustification, withoutProtocol, withProtocol
  }]
}
```

---

### 5.6 Catalogo de Biomarcadores

#### Archivo: `src/lib/biomarker-ranges.ts`

**133 biomarcadores** en **16 categorias** con rangos de medicina de longevidad:

| Categoria | Cantidad | Alta Relevancia | Fuentes |
|-----------|:--------:|:---------------:|---------|
| Hematologia | 16 | RDW, WBC, NLR | Harrison's |
| Metabolismo (Glucosa) | 4 | Glucosa, HbA1c, Insulina, HOMA-IR | Stanford |
| Metabolismo (Renal) | 5 | Creatinina, TFGe, Acido Urico | KDIGO |
| Lipidos | 8 | LDL, HDL, TG, ApoB, Lp(a) | ACC/AHA |
| Lipidos Avanzados | 4 | sdLDL, ox-LDL, Remanente, No-HDL | Harvard |
| Hepatico | 9 | ALT, GGT, Albumina | AASLD |
| Tiroides | 5 | TSH, FT4, FT3 | Endocrine Society |
| Hormonas | 10 | Testosterona, DHEA-S, Cortisol, IGF-1 | ACOG |
| Hormonas Ampliadas | 4 | Leptina, Adiponectina | Friedman/Barzilai |
| Vitaminas y Minerales | 10 | Vit D, B12, Ferritina, Mg, Zn | Mayo Clinic |
| Vitaminas Ampliadas | 12 | MMA, PTH, Cobre | UpToDate, WHO |
| Inflamacion | 5 | PCR-us, Homocisteina, IL-6, TNF-a | Johns Hopkins |
| Electrolitos | 4 | Fosforo | UpToDate |
| Coagulacion | 3 | - | UpToDate |
| Cardiaco | 4 | NT-proBNP, Troponina | ACC/AHA |
| Pancreatico | 4 | Peptido C | Mayo Clinic |
| Inmunologico | 6 | C3, C4 | Harrison's |
| Marcadores Tumorales | 6 | - | NCCN |
| Longevidad | 4 | Omega-3, CoQ10, Glutation, NAD+ | Horvath, Blackburn |
| Longevidad Ampliada | 5 | Telomeros, Cistatina C, GDF-15 | UCSF, Baltimore |
| Metabolismo Avanzado | 3 | - | KDIGO, Sepsis |
| Urinario | 1 | ACR | KDIGO |

**Cada biomarcador incluye:**
- `id` — Identificador unico
- `name` / `shortName` — Nombre completo y abreviatura
- `category` / `subcategory` — Clasificacion
- `unit` + `alternativeUnits` — Unidades con factor de conversion
- `ranges` — Rangos por genero y grupo de edad:
  - `optimal` — Rango de medicina de longevidad (mas estricto)
  - `normal` — Rango de laboratorio convencional
  - `attention` — Fuera de normal, requiere vigilancia
  - `critical` — Requiere intervencion
- `highMeaning` / `lowMeaning` — Significado clinico de valores altos/bajos
- `clinicalSignificance` — Relevancia clinica detallada
- `relatedBiomarkers` — Biomarcadores relacionados
- `longevityRelevance` — high / medium / low

**Funciones de evaluacion:**
```typescript
findBiomarker(nameOrId)          // Busca por ID, nombre o abreviatura
evaluateBiomarker(id, value, gender, age)  // Evalua un biomarcador
evaluateAll(biomarkers, gender, age)       // Evalua todos
```

---

### 5.7 Sistema de Cache

#### 3 Niveles de Cache

**Nivel 1: Cache por Hash de Archivo (0 segundos)**
- Cada archivo subido se hashea con SHA-256
- Si el mismo archivo ya fue analizado, se copia el resultado completo
- Costo IA: $0.00

**Nivel 2: Re-Analisis Parcial (~1-1.5 minutos)**
- Cuando el paciente actualiza su historia clinica y re-analiza
- Se cachean: systemScores, overallScore, longevity_age, keyAlerts, swot, risks
- Se regeneran: clinicalSummary, protocol, projectionData, projectionFactors
- max_tokens: 24,000 (vs 64,000 del analisis completo)
- Costo IA: ~30% del analisis completo

**Nivel 3: Dashboard Instantaneo (0 segundos para el usuario)**
- Tras extraer biomarcadores, el frontend evalua con biomarker-ranges.ts
- Muestra semaforos y scores sin esperar la IA
- El analisis IA corre en background
- Polling cada 8 segundos para detectar cuando la IA termina

---

### 5.8 Flujo de Datos Completo

```
1. SUBIDA DE ARCHIVO
   Usuario → FileUploader → FormData → POST /api/analyze

2. EXTRACCION (Fase 1: ~30-60s)
   /api/analyze → Storage upload → extractBiomarkers(Claude)
   → INSERT lab_results (parsed_data) → SSE 'extracted'

3. DASHBOARD INSTANTANEO (Fase 2: 0s)
   Upload page recibe 'extracted' → Redirect a /dashboard
   → DashboardTabs detecta !ai_analysis + parsedData
   → Renderiza InstantDashboard con biomarker-ranges.ts
   → Polling cada 8s para ai_analysis

4. ANALISIS IA (Fase 3: ~2-5min en background)
   /api/analyze → reanalyzeWithClinicalHistory(Claude)
   → UPDATE lab_results (ai_analysis) → SSE 'done'

5. DASHBOARD COMPLETO
   Polling detecta ai_analysis → Boton "Ver Analisis IA Completo"
   → router.refresh() → DashboardTabs renderiza 11 pestanas

6. RE-ANALISIS
   Boton "Re-analizar" → POST /api/results/[id]/reanalyze
   → Si hay analisis previo: reanalyzePartial (~1.5min)
   → Si no: reanalyzeWithClinicalHistory (~4min)
   → UPDATE lab_results → Refresh dashboard
```

---

### 5.9 Seguridad

#### Autenticacion
- Supabase Auth con email/password
- Middleware en `src/middleware.ts` protege rutas /patients y /onboarding
- Session refresh automatico via cookies
- Roles en `user_metadata.role`: paciente, medico, clinica

#### Row Level Security (RLS)
- `patients`: Solo el dueno puede leer/escribir (user_id = auth.uid())
- `medicos`: Lectura publica para busqueda por codigo, escritura solo propietario
- `patient_medico_links`: Abierto a autenticados (filtrado en codigo de aplicacion)

#### Proteccion de datos
- Clave `anon` expuesta en frontend (disenada para ser publica)
- Clave `service_role` solo en servidor (nunca en NEXT_PUBLIC_)
- RLS como capa de defensa en base de datos
- Filtrado adicional en codigo (user_id en todas las queries)

---

### 5.10 Variables de Entorno

| Variable | Tipo | Descripcion |
|----------|------|-------------|
| NEXT_PUBLIC_SUPABASE_URL | Publica | URL del proyecto Supabase |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Publica | Clave anonima (RLS la protege) |
| ANTHROPIC_API_KEY | Secreta | API key de Claude/Anthropic |

---

## APENDICE A: Estructura de ParsedData

```typescript
interface ParsedData {
  hematology: {
    rbc, hemoglobin, hematocrit, mcv, mch, mchc,
    rdw, wbc, neutrophils, lymphocytes, monocytes,
    eosinophils, platelets, mpv
  }
  metabolic: {
    glucose, urea, bun, creatinine, gfr, uricAcid
  }
  lipids: {
    totalCholesterol, triglycerides, hdl, ldl, vldl,
    nonHdl, atherogenicIndex, ldlHdlRatio, tgHdlRatio
  }
  liver: {
    alkalinePhosphatase, ast, alt, ggt, ldh,
    totalProtein, albumin, globulin, amylase, totalBilirubin
  }
  vitamins: { vitaminD, vitaminB12, ferritin }
  hormones: { tsh, testosterone, cortisol, insulin, hba1c }
  inflammation: { crp, homocysteine }
}
```

## APENDICE B: Estructura de Historia Clinica

```typescript
interface ClinicalHistory {
  anthropometric: { waist_cm, blood_pressure, energy_level }
  allergies: { food, medication, environmental }
  diet: { type, meals_per_day, water_intake, processed_food, alcohol, supplements }
  physical_activity: { type, frequency, sedentary_hours }
  sleep: { hours, quality, snoring }
  mental_health: { stress_level, diagnosed_conditions, therapies }
  cardiovascular: { known_conditions, medications, family_history_cv }
  medical_history: { surgeries, current_medications, chronic_conditions, thyroid_symptoms }
  family_history: { diabetes, cancer, alzheimer, cardiovascular, other }
}
```

---

**Documento generado por Longevity IA — Marzo 2026**
**Confidencial — Uso interno y de inversionistas**
