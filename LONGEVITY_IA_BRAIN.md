# LONGEVITY IA — PROJECT BRAIN

> Archivo de contexto maestro. Leer al inicio de cada sesión para mantener coherencia total del proyecto.

---

## 1. NOMBRE DEL PROYECTO

**Longevity IA**
Plataforma médica con inteligencia artificial que analiza estudios de laboratorio (PDFs e imágenes) para generar análisis de longevidad personalizados: scores por sistema, edad biológica, FODA médica, proyecciones a 10 años y protocolos de intervención basados en evidencia científica 2020-actualidad.

**Directorio raíz**: `C:\Users\Club de Jazz\Documents\CLAUDE CODE\Longevity IA\`
**App Next.js**: `longevity-ia/`
**Estado**: En desarrollo activo

---

## 2. TECH STACK

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 14.2.18 | Framework principal (App Router) |
| React | 18 | UI con hooks modernos |
| TypeScript | 5 | Type safety completo |
| Tailwind CSS | 3.4.1 | Estilos utility-first |
| Recharts | 2.13.3 | Gráficas (radar, barras, líneas) |
| shadcn/ui | — | Componentes base (Button, Card, Input, Select, Badge) |
| Lucide React | 0.460.0 | Iconografía |
| Zustand | 5.0.1 | State management global (`analysisStore`) |
| Sonner | 1.7.1 | Toast notifications |
| react-dropzone | 14.3.5 | Drag & drop de archivos |
| jsPDF | 2.5.2 | Exportación a PDF |
| html2canvas | 1.4.1 | Captura de pantalla para exportar |

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Next.js API Routes | 14.2.18 | Endpoints REST (Node.js runtime) |
| Anthropic SDK | 0.36.3 | Claude Sonnet 4-6 para análisis IA |
| pdf-parse | 1.1.1 | Extracción de texto desde PDFs |
| OpenAI SDK | 6.22.0 | Instalado, no usado activamente |

### Base de datos y almacenamiento
| Tecnología | Versión | Uso |
|---|---|---|
| Supabase | — | PostgreSQL + Auth + Storage |
| @supabase/supabase-js | 2.45.4 | Cliente JS |
| @supabase/ssr | 0.8.0 | Auth compatible con SSR |

### Tema visual
- **Background**: `#050e1a` (azul profundo)
- **Card**: `#0a1628`
- **Accent**: `#00e5a0` (verde médico)
- **Warning**: `#f5a623`
- **Danger**: `#ff4d6d`
- **Info**: `#38bdf8`
- **Fonts**: Space Grotesk (textos), DM Mono (números)

---

## 3. ARCHITECTURE

### Estructura de directorios
```
longevity-ia/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout con Toaster
│   │   ├── page.tsx                # Landing page
│   │   ├── login/page.tsx          # Login + registro (Supabase Auth)
│   │   ├── patients/
│   │   │   ├── page.tsx            # Lista de pacientes con búsqueda
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Redirect a dashboard
│   │   │       ├── dashboard/page.tsx   # Dashboard principal
│   │   │       └── upload/page.tsx      # Subir estudios
│   │   └── api/
│   │       ├── analyze/route.ts    # POST → upload + Claude análisis
│   │       ├── chat/route.ts       # POST → chat streaming
│   │       ├── patients/route.ts   # GET/POST pacientes
│   │       ├── patients/[id]/route.ts
│   │       └── results/[id]/route.ts
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── DashboardTabs.tsx   # Componente principal de tabs
│   │   │   ├── ExportButtons.tsx   # PDF, PNG, impresión
│   │   │   ├── LongevityChat.tsx   # Chat flotante streaming
│   │   │   └── tabs/
│   │   │       ├── SummaryTab.tsx
│   │   │       ├── SwotTab.tsx
│   │   │       ├── LipidsTab.tsx
│   │   │       ├── MetabolicTab.tsx
│   │   │       ├── ProjectionTab.tsx
│   │   │       ├── ProtocolTab.tsx
│   │   │       ├── OrganHealthTab.tsx
│   │   │       ├── OrganNetworkDiagram.tsx
│   │   │       └── FilesTab.tsx
│   │   ├── patients/
│   │   │   ├── PatientCard.tsx
│   │   │   └── NewPatientModal.tsx
│   │   ├── upload/FileUploader.tsx
│   │   └── ui/                     # shadcn components
│   ├── lib/
│   │   ├── anthropic/analyzer.ts   # Motor de análisis con Claude
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── queries.ts
│   │   └── utils.ts
│   ├── types/index.ts              # Tipos TypeScript centralizados
│   ├── store/analysisStore.ts      # Estado global Zustand
│   └── middleware.ts               # Protección de rutas
```

### Base de datos (Supabase)
```sql
-- Tabla patients
CREATE TABLE patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,   -- Formato: LNG-[timestamp]-[random]
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
  parsed_data JSONB,       -- Biomarcadores extraídos
  ai_analysis JSONB,       -- Análisis completo de Claude
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Storage bucket
-- lab-files (público, acceso por URL firmada)
```

### Flujo principal de análisis
```
Upload (PDF/imagen)
  → Supabase Storage (bucket: lab-files)
  → pdf-parse extrae texto
  → Claude Sonnet 4-6 (SYSTEM_PROMPT + USER_PROMPT ~300 líneas)
  → JSON con parsedData + aiAnalysis
  → Guardado en lab_results (JSONB)
  → Redirect a /patients/[id]/dashboard?resultId=xxx
  → Dashboard renderiza 8 tabs con datos
```

### Estructura del JSON de análisis (AIAnalysis)
```typescript
{
  systemScores: {
    cardiovascular, metabolic, hepatic, renal,
    immune, hematologic, inflammatory, vitamins  // 0-100 cada uno
  },
  overallScore: number,
  longevity_age: number,         // Edad biológica
  clinicalSummary: string,
  keyAlerts: [{ title, description, level, value, target }],
  swot: {
    strengths, weaknesses, opportunities, threats
    // Cada item: { label, detail, expectedImpact | probability }
  },
  risks: [{ disease, probability, horizon, drivers, color }],
  protocol: [{
    number, category, molecule, dose, mechanism,
    evidence, clinicalTrial, targetBiomarkers,
    expectedResult, action,
    urgency: 'immediate' | 'high' | 'medium' | 'low'
  }],
  projectionData: [{
    year (1-10), withoutIntervention, withIntervention,
    yearRisk: { biomarkers, conditions, urgencyNote }
  }],
  projectionFactors: [{
    factor, currentValue, optimalValue,
    medicalJustification, withoutProtocol, withProtocol
  }]
}
```

### Rutas API
| Método | Ruta | Función |
|---|---|---|
| POST | `/api/analyze` | Upload archivos → Claude → guardar en DB |
| POST | `/api/chat` | Chat streaming con contexto del paciente |
| GET/POST | `/api/patients` | Listar / crear pacientes |
| GET/DELETE | `/api/patients/[id]` | Paciente específico |
| GET | `/api/results/[id]` | Resultado de análisis |

---

## 4. CODING STANDARDS

### General
- **TypeScript estricto**: Sin `any`, tipos definidos en `src/types/index.ts`
- **Server vs Client components**: Anthropic SDK y pdf-parse solo en rutas API (nodejs runtime). Marcar Client Components con `'use client'`
- **Runtime explícito**: Todas las route handlers llevan `export const runtime = 'nodejs'`
- **Imports**: Paths relativos dentro de `src/`, paths absolutos para `@/`

### Componentes
- Nombres en PascalCase: `DashboardTabs.tsx`, `PatientCard.tsx`
- Un componente por archivo
- Props tipadas con interfaces, no `type`
- No pasar datos crudos de DB directamente al cliente — transformar primero

### Estilos
- Tailwind CSS exclusivamente (sin CSS inline salvo exportación dark→light)
- Variables de color del tema en `tailwind.config.ts` — no usar colores hardcodeados
- Clases utilitarias de animación en `globals.css`: `fadeIn`, `slideUp`, `slideIn`, `pulse-glow`
- Badges de estado: usar clases `.badge-optimal`, `.badge-normal`, `.badge-warning`, `.badge-danger`

### IA / Prompts
- Prompts en `src/lib/anthropic/analyzer.ts` — no dispersar prompts en rutas API
- Rangos óptimos de longevidad son diferentes a rangos convencionales — siempre respetar los definidos en el USER_PROMPT
- El campo `molecule` en el protocolo **nunca puede estar vacío**
- Claude devuelve JSON — siempre usar try/catch al parsear y validar estructura mínima antes de guardar en DB

### Base de datos
- Usar funciones de `src/lib/supabase/queries.ts` — no llamar a Supabase directamente desde componentes
- Cliente browser: `src/lib/supabase/client.ts`
- Cliente servidor: `src/lib/supabase/server.ts`
- RLS habilitado en `patients` y `lab_results`

### Exportación
- Conversión dark→light para PDF/PNG: inyectar CSS temporal, capturar, remover CSS
- No modificar estilos permanentes para exportar

---

## 5. ACTIVE SKILLS

Funcionalidades completamente implementadas y en uso activo:

| Skill | Descripción | Archivos clave |
|---|---|---|
| Auth completa | Login, registro, logout, middleware protección | `login/page.tsx`, `middleware.ts`, `supabase/server.ts` |
| CRUD pacientes | Crear, listar, buscar, eliminar (full o keep history) | `patients/page.tsx`, `PatientCard.tsx`, `NewPatientModal.tsx` |
| Upload drag & drop | PDF e imágenes, selector de fecha, animación 5 etapas | `upload/page.tsx`, `FileUploader.tsx` |
| Análisis Claude | Extracción biomarcadores + análisis completo + JSON estructurado | `analyzer.ts`, `api/analyze/route.ts` |
| Dashboard 8 tabs | Resumen, FODA, Lípidos, Metabólico, Proyección, Protocolo, Órganos, Archivos | `DashboardTabs.tsx`, `tabs/` |
| Gráficas dinámicas | Radar, barras, líneas (Recharts) con datos reales del análisis | `SummaryTab`, `SwotTab`, `LipidsTab`, `ProjectionTab` |
| Chat streaming | Asistente flotante con contexto del paciente, ReadableStream | `LongevityChat.tsx`, `api/chat/route.ts` |
| Exportación | PDF completo, PNG por tab, impresión (dark→light) | `ExportButtons.tsx` |
| Código de paciente | Autogenerado formato `LNG-[timestamp]-[random]` | `NewPatientModal.tsx` |
| URL persistente | Tab activo guardado como `?tab=N` para compartir/recargar | `DashboardTabs.tsx` |

**Pendiente / En desarrollo:**
- Historial de análisis por paciente (timeline de múltiples estudios)
- Persistencia del historial de chat en DB
- Retry automático si Claude devuelve JSON malformado
- Análisis comparativo entre estudios del mismo paciente

---

## 6. NEVER TOUCH WITHOUT ASKING

Los siguientes elementos son críticos y no deben modificarse sin confirmación explícita:

### Prompts de Claude
- `SYSTEM_PROMPT` y `USER_PROMPT` en `src/lib/anthropic/analyzer.ts`
- Contienen 300+ líneas con referencias científicas específicas, rangos óptimos de longevidad calibrados y estructura JSON esperada. Cualquier cambio afecta todos los análisis.

### Esquema de base de datos
- Tablas `patients` y `lab_results` en Supabase
- Los campos `parsed_data` y `ai_analysis` (JSONB) tienen estructura definida en `src/types/index.ts`
- Cambios requieren migración y actualización de todos los componentes del dashboard

### Estructura del JSON AIAnalysis
- Definida en `src/types/index.ts`
- Todos los tabs del dashboard dependen de esta estructura
- Renombrar o eliminar campos rompe el dashboard completo

### Variables de entorno
- `.env.local`: API keys de Anthropic y Supabase
- No commitear, no loguear, no exponer al cliente

### Middleware de autenticación
- `src/middleware.ts`: Controla acceso a toda la app
- Cambios incorrectos pueden dejar rutas desprotegidas o romper el flujo de auth

### Tema visual / paleta de colores
- Colores del tema en `tailwind.config.ts`
- El diseño médico oscuro es parte de la identidad del producto

### Bucket de storage
- `lab-files` en Supabase Storage
- Los `file_urls` guardados en DB apuntan a este bucket — cambiar nombre o configuración rompe todos los estudios existentes

---

*Ultima actualización: Marzo 2026*
