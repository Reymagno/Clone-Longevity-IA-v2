# LONGEVITY IA — Manual Ejecutivo

**Plataforma de Inteligencia Artificial para Medicina de Longevidad**
Versión 4.0 | Abril 2026

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
- Motor matematico propietario con funciones sigmoideas calibradas con UK Biobank, NHANES III y Framingham
- Scoring determinista: mismo perfil siempre genera mismo score (no depende de IA para calculos)
- Edad biologica con formula PhenoAge (Levine 2018) + 7 modificadores basados en evidencia
- FODA medica hibrida v3.0: motor matematico selecciona biomarcadores (determinista), Claude redacta narrativa personalizada con historia clinica del paciente
- Proyeccion a 10 anos con modelo Gompertz (mortalidad se duplica cada 8 anos)
- Verificacion de interacciones farmacologicas (10 pares criticos) y contraindicaciones por condicion
- Integracion preparada para 13 metricas de wearables (HR, HRV, VO2max, pasos, sueno, CGM, SpO2)
- 8 calculadoras clinicas auto-computadas (HOMA-IR, FIB-4, CKD-EPI, Framingham, ASCVD Risk)
- Panel clinico del medico: notas SOAP, comentarios por biomarcador, aprobacion/rechazo de protocolo, diagnosticos CIE-10
- Prescripcion digital: conversion del protocolo IA en receta medica PDF con membrete, cedula, firma, clasificacion OTC/Rx/Procedimiento
- Alertas inteligentes con panel lateral, resumen semanal, priorizacion automatica por urgencia
- Tendencias longitudinales: comparacion entre analisis con graficas de biomarcadores y scores por sistema en linea de tiempo
- Referencias verificadas via PubMed, Semantic Scholar y OpenAlex con abstracts y DOIs
- Protocolo personalizado con evidencia cientifica de instituciones de nivel mundial
- Dashboard instantaneo (segundos) + analisis profundo IA (minutos)
- Sistema multi-rol: paciente, medico y clinica
- Vinculacion segura paciente-medico por codigo unico
- Chatbot conversacional que extrae historia clinica automaticamente
- Catálogo de 164 biomarcadores: 133 sanguíneos + 31 urinarios con rangos por género y edad
- Protocolo de péptidos terapéuticos: BPC-157, Tesamorelina, TB-500, GHK-Cu, Tirzepatida, Semaglutida con motor determinista y evidencia 2022-2026
- Análisis de orina integrado: microalbuminuria/ACR (daño renal temprano), metales pesados, cortisol 24h, litiasis
- 9+ referencias científicas expandibles por molécula del protocolo (36+ estudios verificados)
- Evidencia científica expandible en cada intervención del protocolo
- Deduplicación automática de protocolo (código + prompt)
- Metodología transparente con pie de página en cada sección del dashboard
- Motor de clínica completo: gestión de médicos y pacientes desde panel institucional
- QR único por paciente para acceso rápido en consulta presencial
- Timeline clínico interactivo: cronología visual de laboratorios, consultas y notas de voz
- Reportes PDF con marca institucional (nombre de clínica en portada, header y footer)
- Diseño premium de reporte PDF: portada con score circular, paleta gold, badges redondeados
- Consulta médica por voz: grabación, transcripción automática y análisis SOAP con IA
- Auditoría de seguridad: ownership checks, file size limits, crypto codes, middleware hardening

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
- Crear y gestionar pacientes propios + pacientes vinculados por invitacion
- Notas clinicas SOAP (Subjetivo, Objetivo, Assessment, Plan) con historial auditable
- 8 calculadoras clinicas auto-computadas (HOMA-IR, FIB-4, CKD-EPI, ASCVD, Framingham, IMC, TG/HDL, Ind. Aterogenico)
- Tendencias longitudinales: deltas entre analisis, velocidad de cambio, proyeccion a danger
- Alertas inteligentes: nuevos analisis, biomarcadores en danger, empeoramiento >20%
- Referencias verificadas PubMed / Semantic Scholar / OpenAlex con abstracts y DOIs
- Chat conversacional con IA para pacientes propios y vinculados
- Reportes medicos PDF profesionales
- Protocolo con evidencia cientifica y verificacion de interacciones farmacologicas
- Algoritmo de celulas madre hUC-MSC y exosomas
- Re-analisis con historia clinica (pacientes propios)
- Seguimiento de citas y proximos pasos
- Panel de invitaciones de pacientes

#### Plan Clinica
- Todo lo del Plan Medico incluido
- Crear cuentas de medicos directamente desde el panel
- Crear pacientes y asignarlos a medicos del staff
- Dashboard institucional con 4 tabs (Resumen, Medicos, Pacientes, Estadisticas)
- KPIs en tiempo real: pacientes activos, analisis del mes, alertas, medicos
- QR unico por paciente para acceso rapido en consulta
- Timeline clinico interactivo por paciente
- Reportes PDF con marca de la clinica (nombre, contacto, logo)
- Configuracion institucional (RFC, datos fiscales, logo)
- Soporte prioritario

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
El dashboard tiene 13 pestañas (Tendencias es exclusiva para médicos):

| # | Pestaña | Contenido |
|---|---------|-----------|
| 0 | Resumen | Score de longevidad, edad biológica, resumen ejecutivo, alertas clave, salud de órganos, panel clínico del médico |
| 1 | FODA Médica | Fortalezas, Debilidades, Oportunidades, Amenazas — selección determinista + narrativa personalizada por Claude |
| 2 | Lípidos | Perfil lipídico completo con gráficos (CT, LDL, HDL, TG, VLDL, ratios) |
| 3 | Metabólico | Glucosa, insulina, HOMA-IR, función renal, ácido úrico |
| 4 | Proyección | Gráfico de proyección a 10 años con/sin protocolo, factores de riesgo (Gompertz) |
| 5 | Órganos | Scores por sistema orgánico con diagrama de red |
| 6 | Protocolo | 8-12 intervenciones personalizadas con molécula, dosis, mecanismo, evidencia expandible (9 refs/molécula), prescripción digital |
| 7 | Células Madre | Cálculo personalizado de dosis MSC y exosomas con 8 factores clínicos |
| 8 | Péptidos | Protocolo de 6 péptidos terapéuticos con motor determinista, dosis, evidencia 2022-2026 y contraindicaciones |
| 9 | Historia Clínica | Visualización de datos clínicos recopilados (solo paciente propio) |
| 10 | Comparar | Comparativa temporal entre múltiples análisis |
| 11 | Estudio | Archivo original del laboratorio |
| 12 | Tendencias | Comparación longitudinal: biomarcadores, scores por sistema, velocidad de cambio (solo médicos) |

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

#### 4.2.3 Crear Pacientes Propios
- El medico puede crear pacientes directamente con el boton "Nuevo Paciente"
- Los pacientes creados por el medico son "propios" — control total
- El medico puede crear multiples pacientes (sin limite)
- Puede subir estudios, completar historia clinica, re-analizar y usar chatbot

#### 4.2.4 Invitaciones de Pacientes
1. Cuando un paciente envia invitacion, aparece un banner de notificacion
2. Hacer clic en "Invitaciones" para ver la lista
3. Cada invitacion muestra: nombre, codigo, edad, genero, peso, estatura, IMC, analisis realizados, estado de historia clinica
4. Opciones: Aceptar (acceso a analisis) o Rechazar

#### 4.2.5 Permisos del Medico (Paciente Propio vs Vinculado)

| Funcion | Paciente propio | Paciente vinculado |
|---------|:-:|:-:|
| Ver dashboard completo (12 pestanas) | Si | Si |
| Tendencias longitudinales (tab exclusivo) | Si | Si |
| Panel clinico (SOAP + biomarcadores + protocolo + CIE-10) | Si | Si |
| Prescripcion digital PDF | Si | Si |
| Alertas inteligentes | Si | Si |
| Chatbot Longevity IA | Si | Si |
| Referencias verificadas (PubMed, Semantic Scholar, OpenAlex) | Si | Si |
| Calculadoras clinicas | Si | Si |
| Exportar PDF | Si | Si |
| Subir nuevo estudio | Si | No |
| Re-analizar | Si | No |
| Historia Clinica | Si | No |
| Eliminar paciente | Si | No (solo desvincular) |

#### 4.2.6 Panel Clinico del Medico

En el dashboard del paciente (tab Resumen, al fondo), aparece el "Panel Clinico del Medico" con 4 sub-tabs. Todas las notas se guardan en `clinical_notes` (tabla del medico, NO modifica el analisis del paciente). Cada nota tiene timestamp auditable.

**Tab 1: Notas SOAP**
1. Hacer clic en "Nueva nota SOAP"
2. Llenar formulario de 4 campos:
   - **S (Subjetivo):** Lo que el paciente reporta (sintomas, quejas)
   - **O (Objetivo):** Hallazgos del examen fisico, signos vitales, labs
   - **A (Evaluacion):** Diagnosticos, interpretacion clinica, severidad
   - **P (Plan):** Plan de tratamiento, ajustes al protocolo, proximos pasos
3. Historial expandible con campos coloreados por tipo

**Tab 2: Comentarios por Biomarcador**
1. Hacer clic en "Comentar biomarcador"
2. Se muestra un grid visual con TODOS los biomarcadores del analisis actual
3. Cada biomarcador muestra valor, unidad y color por status (danger=rojo, warning=amarillo, optimal=verde)
4. El medico selecciona un biomarcador y escribe comentario clinico
5. Ejemplo: "Este LDL requiere estatina por historia familiar de enfermedad coronaria prematura"

**Tab 3: Revision de Protocolo**
1. Hacer clic en "Revisar protocolo"
2. Se listan todas las intervenciones del protocolo de IA
3. Cada molecula tiene 3 botones: Aprobar (verde), Rechazar (rojo), Modificar (amarillo)
4. Al rechazar: campo para escribir la razon
5. Al modificar: campos para nueva dosis + razon
6. Conteo en tiempo real: "3 aprobadas, 1 rechazada, 2 modificadas"
7. IMPORTANTE: el analisis original NO se modifica — la revision queda como nota auditable

**Tab 4: Diagnosticos CIE-10**
1. Hacer clic en "Agregar diagnosticos"
2. 27 codigos CIE-10 precargados relevantes para longevidad (E11, E78, I10, K76, N18, R73, etc.)
3. Buscador por codigo o nombre
4. Seleccion multiple con badges
5. Los diagnosticos se guardan como nota con array de codigos

#### 4.2.7 Referencias Verificadas
1. En el tab "Protocolo", aparece el boton "Buscar referencias cientificas"
2. Busca en 3 bases de datos academicas simultaneamente:
   - **PubMed** — titulos, autores, journal, ano, PMID, abstract
   - **Semantic Scholar** — incluye TLDR (resumen IA de 1 linea) y conteo de citas
   - **OpenAlex** — incluye badge Open Access y link a PDF gratuito si existe
3. Cada referencia muestra DOI verificable y link directo al paper
4. Boton "Ver resumen del estudio" para leer el abstract sin salir de Longevity IA

#### 4.2.8 Calculadoras Clinicas
Se calculan automaticamente con los datos del paciente (sin ingreso manual):

| Calculadora | Formula | Referencia |
|------------|---------|-----------|
| HOMA-IR | Glucosa x Insulina / 405 | Matthews, Diabetologia 1985 |
| FIB-4 | (Edad x AST) / (Plaquetas x raiz(ALT)) | Sterling, Hepatology 2006 |
| CKD-EPI eGFR | Formula CKD-EPI 2021 sin raza | Levey, Ann Intern Med 2009 + KDIGO 2021 |
| Indice Aterogenico | (Col.Total - HDL) / HDL | Castelli, Can J Cardiol 2004 |
| Ratio TG/HDL | Trigliceridos / HDL | McLaughlin, Circulation 2005 |
| IMC | Peso / Estatura^2 | WHO 2024 |
| Framingham Risk | Score de puntos simplificado | D'Agostino, Circulation 2008 |
| ASCVD Risk | Pooled Cohort Equations | Goff, Circulation 2014 |

#### 4.2.9 Tendencias Longitudinales (Exclusivo Medico)

Dashboard visual que compara biomarcadores entre multiples analisis del mismo paciente. Disponible como tab "Tendencias" en el dashboard (solo visible para medicos). Requiere al menos 2 analisis del paciente.

**4 secciones interactivas:**

| Seccion | Contenido |
|---------|-----------|
| Resumen | Conteo de biomarcadores mejorando/empeorando/estables, grafica del Score General en linea de tiempo, alertas de velocidad de deterioro |
| Biomarcadores | Lista expandible de cada biomarcador con mini-grafica de evolucion, delta %, velocidad mensual y proyeccion |
| Scores por Sistema | Grafica de linea temporal por cada sistema (cardiovascular, metabolico, hepatico, renal, etc.) mostrando la evolucion del score sigmoid |
| Velocidad de Cambio | Tabla ordenada por tasa de cambio: biomarcadores con mayor velocidad de deterioro primero, con proyeccion de meses hasta nivel critico u optimo |

**Alertas de velocidad:**
- Si un biomarcador empeora >10%: alerta warning
- Si empeora >20%: alerta danger
- Si la proyeccion lineal indica nivel critico en <12 meses: alerta con mensaje "A este ritmo de deterioro, [biomarcador] llegara a nivel critico en ~X meses"

**Scores por sistema en linea de tiempo:**
- Cada sistema muestra su score (0-100) en cada analisis con grafica de linea
- Ejemplo: "Cardiovascular: 72 → 68 → 63 en 3 analisis" con indicador de tendencia

**Datos analizados:** 24 biomarcadores con rangos optimos de longevidad, delta absoluto, delta porcentual, velocidad de cambio mensual, proyeccion a rango optimo o critico.

#### 4.2.10 Protocolo de Péptidos Terapéuticos

Pestaña "Péptidos" en el dashboard. Motor determinista que evalúa biomarcadores, historial clínico, edad e IMC del paciente para generar un protocolo personalizado de 6 péptidos.

**Péptidos evaluados:**

| Péptido | Dosis estándar | Vía | Categoría | Evidencia principal |
|---|---|---|---|---|
| BPC-157 | 250-500 mcg 2x/día | SC / oral | Reparación tisular, gastroprotección | Sikiric, Biomedicines 2024 (Univ. Zagreb) |
| Tesamorelina | 2 mg/día | SC abdomen | Composición corporal, NASH | Stanley, NEJM 2025 (Harvard/MGH) |
| TB-500 | 2.5-5 mg 2x/sem | SC | Regeneración cardíaca, antiinflamatorio | Smart, Nature 2011 (UCL) |
| GHK-Cu | 1-2 mg/día | SC / tópica | Anti-aging, neuroprotección | Pickart, BioMed Res Int 2015 |
| Tirzepatida | 2.5→15 mg/sem | SC | Metabólico, peso, NASH | SURMOUNT-5, NEJM 2025 (Eli Lilly) |
| Semaglutida | 0.25→2.4 mg/sem | SC / oral | Cardioprotección, nefroprotección | SELECT NEJM 2023; FLOW NEJM 2024 |

**Lógica de selección:**
- Cada péptido tiene triggers por biomarcador (ej: PCR >1.0 activa BPC-157, glucosa >100 activa Tirzepatida)
- Triggers clínicos por historial (ej: "hígado graso" activa Tesamorelina con relevancia 95%)
- Triggers por edad e IMC (ej: Tirzepatida si IMC ≥27)
- Score de relevancia 0-100 determina prioridad y urgencia (alta/media/baja)
- Solo se recomiendan péptidos con relevancia ≥50% o al menos 1 trigger con relevancia ≥70%

**Cada tarjeta de péptido muestra:**
- Score de relevancia, urgencia, badge de supervisión médica
- Dosis, vía, frecuencia, duración
- Mecanismo de acción detallado
- Justificación clínica personalizada (basada en biomarcadores del paciente)
- Contraindicaciones
- 4 estudios científicos expandibles con autor, revista, año, institución y hallazgo

#### 4.2.11 Alertas Inteligentes

Panel lateral deslizable accesible desde el boton "Alertas" en la pantalla de pacientes. Badge rojo pulsante muestra conteo de alertas no leidas.

**Generacion automatica de alertas (triggers):**
Las alertas se generan automaticamente al completar un analisis nuevo o re-analisis:

| Tipo de alerta | Nivel | Trigger |
|---|---|---|
| Nuevo analisis | info | Paciente sube estudio de laboratorio |
| Biomarcador critico | danger/critical | Biomarcador con status "danger" (critical si >=3 biomarcadores) |
| Biomarcador empeorado | warning/danger | Biomarcador empeora >20% vs analisis anterior (danger si >=3) |
| Score critico | critical | Score General <40/100 |

**Panel de alertas:**
- Resumen semanal: badges con "X requieren atencion", "Y en observacion", "Z estables"
- Priorizacion por paciente: pacientes ordenados por urgencia (critical > danger > warning > info), cada uno es link directo a su dashboard
- Filtros: Todas / Sin leer / Criticas
- Acciones masivas: Marcar todo como leido, Descartar todo
- Cada alerta muestra: icono por tipo, nivel de severidad, titulo, detalle, nombre del paciente, fecha
- Acciones por alerta: Marcar como leida / Descartar / Ver dashboard del paciente

**Impacto:** El medico no revisa 50 dashboards uno por uno — ve primero los pacientes que necesitan atencion inmediata.

#### 4.2.12 Prescripción Digital

Boton "Generar Prescripcion" en el tab Protocolo del dashboard (solo medicos). Abre un modal fullscreen para convertir el protocolo de IA en una receta medica legal.

**Funcionalidad:**
1. Cada intervencion del protocolo IA se puede: Aprobar / Rechazar / Modificar dosis
2. Clasificacion por tipo: **OTC** (paciente compra solo) / **Rx** (requiere receta medica) / **Procedimiento** (clinica)
3. Toggle "Requiere supervision medica" por intervencion (auto-activado para Rx y procedimientos)
4. Agregar intervenciones propias del medico (no solo las de IA): molecula, dosis, clasificacion, instrucciones
5. Campo de notas y observaciones generales
6. Boton "Aprobar todas" para accion masiva

**PDF generado (jsPDF, formato A4):**

| Seccion | Contenido |
|---|---|
| Membrete | Nombre del medico, especialidad, cedula profesional, email |
| Titulo | "PRESCRIPCION MEDICA" con fecha |
| Datos del paciente | Nombre, edad, genero, peso, estatura |
| Medicamentos Rx | Intervenciones con receta, badge "SUPERVISION MEDICA" si aplica |
| Suplementos OTC | Intervenciones de venta libre |
| Procedimientos | Intervenciones clinicas (hUC-MSC, exosomas, etc.) |
| Notas | Observaciones del medico |
| Firma | Linea de firma + nombre + especialidad + cedula profesional |
| Pie de pagina | "Prescripcion generada por Longevity IA — Longevity Clinic SA de CV" |

**Separacion de responsabilidad:** El analisis de IA (lab_results.ai_analysis) es INMUTABLE. La prescripcion es una capa adicional del medico que no modifica el analisis original. El PDF es el documento legal con la firma del medico.

#### 4.2.13 Evidencia Científica Expandible

En el tab Protocolo, cada intervención tiene un enlace sutil "Ver más evidencia científica" que despliega 9 referencias adicionales categorizadas:

| Categoría | Estudios incluidos |
|---|---|
| Suplementación | REDUCE-IT (omega-3), Q-SYMBIO (CoQ10), VITAL Trial (VitD), berberina, NAC, sulforafano, astaxantina, magnesio, curcumina |
| Farmacológico | TAME (metformina), PEARL (rapamicina), VESALIUS-CV (PCSK9i), SELECT (semaglutida), D+Q senolíticos, espermidina, DAPA-HF, fisetina |
| Estilo de vida | VO2max (predictor #1), Zone 2, fuerza, TRE, sueño, frío, meditación/telómeros, sauna finlandesa, PREDIMED |
| Medicina regenerativa | Longeveron Phase 2b, MSC en NMOSD, meta-análisis seguridad, exosomas, OSK reprogramación, paracrina Karolinska |

#### 4.2.14 Desvincular Paciente
- En la tarjeta del paciente vinculado, hacer clic en la "X"
- Confirmar desvinculacion
- Se revoca el acceso; el paciente puede re-invitar en el futuro
- Los datos del paciente NO se eliminan

---

### 4.3 Clinica

#### 4.3.1 Registro
1. En la pagina principal, hacer clic en "Ingresar" debajo de "Clinica"
2. Completar: nombre de clinica, RFC, correo, contrasena, telefono, direccion, director medico
3. Se crea la cuenta institucional con acceso al panel de administracion

#### 4.3.2 Panel de Clinica — Dashboard Institucional

El dashboard de clinica tiene 4 pestanas con diseno premium (acento dorado):

| Pestana | Contenido |
|---------|-----------|
| Resumen | 4 KPIs (pacientes, analisis del mes, alertas, medicos), lista del staff, actividad reciente |
| Medicos | Grid de medicos del staff con busqueda, crear nuevo medico |
| Pacientes | Lista de todos los pacientes de la clinica con filtros por medico, crear nuevo paciente |
| Estadisticas | Distribucion de pacientes por medico, metricas de actividad |

#### 4.3.3 Crear Medicos del Staff

La clinica puede crear cuentas de medico directamente desde el panel:

1. Ir a la pestana "Medicos"
2. Hacer clic en "Nuevo Medico"
3. Completar: nombre completo, email, contrasena, especialidad (8 opciones), cedula profesional
4. El sistema crea automaticamente:
   - Cuenta de autenticacion con rol "medico"
   - Perfil en tabla `medicos` con `clinica_id` vinculado
   - Codigo unico de medico (MED-XXXXXX)
5. El medico puede iniciar sesion inmediatamente con sus credenciales

**Especialidades disponibles:** Medicina General, Cardiologia, Endocrinologia, Medicina Interna, Geriatria, Medicina Deportiva, Nutriologia, Otra.

#### 4.3.4 Crear Pacientes

La clinica puede crear pacientes y asignarlos a un medico del staff:

1. Ir a la pestana "Pacientes"
2. Hacer clic en "Nuevo Paciente"
3. Completar: nombre, edad, genero, peso, estatura, notas
4. Seleccionar el medico responsable del dropdown (solo medicos del staff)
5. El paciente queda vinculado a la clinica y al medico seleccionado
6. El medico asignado puede ver y gestionar al paciente desde su cuenta

#### 4.3.5 KPIs del Panel de Resumen

| KPI | Descripcion | Color |
|-----|-------------|-------|
| Pacientes Activos | Total de pacientes creados por la clinica | Verde |
| Analisis este Mes | Estudios de laboratorio procesados en el mes actual | Azul |
| Alertas Pendientes | Alertas no leidas de todos los pacientes | Ambar |
| Medicos del Staff | Total de medicos vinculados a la clinica | Morado |

#### 4.3.6 QR de Acceso Rapido al Paciente

Cada paciente tiene un codigo QR unico que apunta directamente a su dashboard:

1. En la lista de pacientes, cada paciente tiene un icono de QR
2. El QR codifica la URL: `/patients/{id}/dashboard`
3. Se puede descargar como imagen PNG con el nombre del paciente
4. Util para consulta presencial: el medico escanea y accede al dashboard instantaneamente

#### 4.3.7 Timeline Clinico del Paciente

Vista cronologica interactiva que combina todas las actividades del paciente:

| Tipo | Icono | Color | Datos mostrados |
|------|-------|-------|-----------------|
| Laboratorio | BarChart2 | Verde | Fecha, score general, resumen clinico |
| Consulta | Stethoscope | Azul | Fecha, resumen SOAP, duracion |
| Nota de voz | Mic | Ambar | Fecha, transcripcion, analisis IA |

- Eventos ordenados cronologicamente (mas recientes primero)
- Tarjetas expandibles para ver detalles
- Score de longevidad visible en eventos de laboratorio

#### 4.3.8 Reportes con Marca Institucional

Los reportes PDF generados desde el dashboard pueden incluir la marca de la clinica:

- **Portada:** Nombre de la clinica en lugar de "Longevity IA"
- **Header de pagina:** Nombre de la clinica con separador dorado
- **Footer de pagina:** Nombre de la clinica + email de contacto + telefono

Para activar: la clinica sube su informacion en configuracion. Los reportes de pacientes de la clinica incluyen automaticamente el branding.

#### 4.3.9 Configuracion de la Clinica

Endpoint PATCH `/api/clinica/settings` permite actualizar:
- Nombre de la clinica
- RFC
- Email de contacto
- Telefono
- Direccion
- Director medico
- Logo (URL de imagen)

#### 4.3.10 Permisos de la Clinica

| Funcion | Clinica | Medico del staff | Paciente |
|---------|:-------:|:----------------:|:--------:|
| Ver panel de administracion | Si | No | No |
| Crear medicos | Si | No | No |
| Crear pacientes | Si | No | No |
| Ver todos los pacientes | Si | Solo asignados | Solo propio |
| Ver todos los medicos | Si | No | No |
| KPIs y estadisticas | Si | No | No |
| Reportes con marca | Si | No | No |
| QR de pacientes | Si | No | No |
| Timeline de pacientes | Si | Si | Si |
| Dashboard de analisis | No | Si | Si |
| Notas SOAP | No | Si | No |
| Prescripcion digital | No | Si | No |

#### 4.3.11 Arquitectura Tecnica del Motor Clinica

**API Routes:**

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/clinica/medicos` | GET | Listar medicos del staff con conteo de pacientes |
| `/api/clinica/medicos` | POST | Crear cuenta de medico vinculada a la clinica |
| `/api/clinica/patients` | GET | Listar pacientes de la clinica (filtro por medico) |
| `/api/clinica/patients` | POST | Crear paciente asignado a un medico del staff |
| `/api/clinica/stats` | GET | KPIs: total medicos, pacientes, analisis del mes, alertas |
| `/api/clinica/settings` | PATCH | Actualizar datos y logo de la clinica |

**Base de datos (nuevas columnas):**

| Tabla | Columna nueva | Tipo | Descripcion |
|-------|--------------|------|-------------|
| medicos | clinica_id | UUID FK -> clinicas | Vinculo con clinica (nullable) |
| patients | clinica_id | UUID FK -> clinicas | Vinculo con clinica (nullable) |
| clinicas | logo_url | TEXT | URL del logo para reportes |

**Seguridad:**
- Todas las API routes verifican `role === 'clinica'` antes de procesar
- Creacion de usuarios usa Supabase Admin (service role key) para operaciones cross-user
- La service role key solo existe en el servidor (variables de entorno de Vercel)
- Medicos y pacientes independientes (sin clinica_id) no se ven afectados

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
| QR | qrcode | 1.5.4 | Generacion de codigos QR por paciente |
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
│   │   ├── results/[id]/         # Resultados + re-analisis + DELETE
│   │   ├── references/route.ts   # Busqueda PubMed/Semantic Scholar/OpenAlex
│   │   ├── medico/
│   │   │   ├── invitations/      # Invitaciones medico
│   │   │   ├── notes/route.ts    # CRUD notas clinicas SOAP
│   │   │   └── alerts/route.ts   # Alertas inteligentes
│   │   ├── clinica/
│   │   │   ├── medicos/route.ts  # CRUD medicos del staff
│   │   │   ├── patients/route.ts # CRUD pacientes de clinica
│   │   │   ├── stats/route.ts    # KPIs de la clinica
│   │   │   └── settings/route.ts # Configuracion de clinica
│   │   ├── consultations/        # Consultas medicas (SOAP)
│   │   ├── consultations/transcribe/ # Transcripcion audio
│   │   ├── voice-notes/          # Notas de voz
│   │   └── transcribe/           # Transcripcion Whisper
│   └── globals.css               # Estilos globales + animaciones
│
├── components/
│   ├── auth/RegisterModal.tsx    # Registro por rol
│   ├── clinica/
│   │   ├── ClinicaDashboard.tsx  # Panel clinica (4 tabs)
│   │   ├── CreateMedicoModal.tsx # Modal crear medico
│   │   ├── CreatePatientModal.tsx# Modal crear paciente
│   │   ├── PatientQRCode.tsx     # Generador QR por paciente
│   │   ├── PatientTimeline.tsx   # Timeline cronologico
│   │   └── tabs/                 # ResumenTab, MedicosTab, PacientesTab, EstadisticasTab
│   ├── consultation/
│   │   ├── ConsultationRecorder  # Grabacion de consulta medica
│   │   ├── ConsultationDetail    # Detalle de consulta
│   │   └── ConsultationHistory   # Historial de consultas
│   ├── voice/
│   │   └── VoiceRecorder.tsx     # Grabador de voz con transcripcion
│   ├── dashboard/
│   │   ├── DashboardTabs.tsx     # Orquestador de 13 pestañas
│   │   ├── InstantDashboard.tsx  # Dashboard instantaneo (Fase 2)
│   │   ├── LongevityChat.tsx     # Chatbot conversacional
│   │   ├── ExportButtons.tsx     # Exportacion PDF/imagen
│   │   └── tabs/                 # 13 componentes de pestaña (incluye PeptidesTab)
│   ├── medico/
│   │   ├── InvitationsPanel.tsx    # Panel de invitaciones
│   │   ├── AlertsPanel.tsx         # Panel lateral de alertas inteligentes
│   │   ├── ClinicalNotesPanel.tsx  # Panel clinico (SOAP + biomarcadores + protocolo + CIE-10)
│   │   └── PrescriptionBuilder.tsx # Constructor de prescripcion digital
│   ├── patients/
│   │   ├── PatientCard.tsx       # Tarjeta de paciente (multi-rol)
│   │   ├── AnalysisCards.tsx     # Tarjetas de analisis por fecha
│   │   ├── MedicoLinksPanel.tsx  # Vinculacion con medicos
│   │   └── NewPatientModal.tsx   # Crear paciente
│   ├── ui/                       # Componentes UI reutilizables
│   └── upload/FileUploader.tsx   # Componente de carga de archivos
│
├── lib/
│   ├── anthropic/analyzer.ts     # Motor IA (prompts + override matematico)
│   ├── longevity-scoring.ts      # Funciones sigmoideas por biomarcador (30+)
│   ├── longevity-phenoage.ts     # Edad biologica PhenoAge (Levine 2018)
│   ├── longevity-foda.ts         # FODA computada (11 biomarcadores)
│   ├── longevity-projection.ts   # Proyeccion Gompertz 10 anos
│   ├── longevity-wearables.ts    # Integracion wearables (13 metricas)
│   ├── longevity-trends.ts       # Tendencias longitudinales entre analisis
│   ├── clinical-calculators.ts   # 8 calculadoras clinicas
│   ├── medical-references.ts     # PubMed + Semantic Scholar + OpenAlex
│   ├── peptide-protocol.ts       # Motor de péptidos terapéuticos (6 péptidos)
│   ├── biomarker-ranges.ts       # Catálogo de 164 biomarcadores (133 sangre + 31 orina)
│   ├── pdf-report.ts             # Generador de PDF reporte medico
│   ├── prescription-pdf.ts       # Generador de PDF prescripcion digital
│   ├── generate-alerts.ts        # Generacion automatica de alertas para medicos
│   ├── supabase/
│   │   ├── client.ts             # Cliente browser (singleton lazy)
│   │   ├── server.ts             # Cliente servidor (request/component)
│   │   ├── admin.ts              # Cliente admin (service role, solo server)
│   │   └── queries.ts            # Esquema de referencia
│   ├── voice-notes-context.ts    # Helper compartido para contexto de notas de voz
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
| clinica_id | UUID FK -> clinicas | Vinculo con clinica (nullable) |
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
| clinica_id | UUID FK -> clinicas | Vinculo con clinica (nullable) |

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
| logo_url | TEXT | URL del logo para reportes (nullable) |

**voice_notes**
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | UUID PK | Identificador unico |
| patient_id | UUID FK -> patients | Paciente |
| user_id | UUID FK -> auth.users | Medico autor |
| transcript | TEXT | Transcripcion del audio |
| ai_summary | TEXT | Analisis IA de la nota |
| audio_url | TEXT | URL del audio en storage |
| duration_seconds | INTEGER | Duracion en segundos |
| created_at | TIMESTAMPTZ | Fecha de creacion |

**consultations**
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | UUID PK | Identificador unico |
| patient_id | UUID FK -> patients | Paciente |
| medico_user_id | UUID FK -> auth.users | Medico autor |
| transcript | TEXT | Insights clinicos (no dialogo crudo) |
| speakers | JSONB | Mapeo de hablantes |
| ai_summary | TEXT | Resumen ejecutivo |
| ai_soap | JSONB | Nota SOAP generada por IA |
| audio_url | TEXT | URL del audio |
| duration_seconds | INTEGER | Duracion en segundos |
| tags | TEXT[] | Etiquetas (seguimiento, urgente, etc.) |
| status | TEXT | completed / in_progress |
| created_at | TIMESTAMPTZ | Fecha de creacion |

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

**clinical_notes** (v3.2)
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | UUID PK | Identificador unico |
| patient_id | UUID FK -> patients | Paciente |
| medico_user_id | UUID FK -> auth.users | Medico autor |
| result_id | UUID FK -> lab_results | Analisis asociado (opcional) |
| note_type | TEXT | soap / comment / protocol_adjustment / diagnosis |
| subjective | TEXT | S: lo que el paciente reporta |
| objective | TEXT | O: hallazgos objetivos |
| assessment | TEXT | A: evaluacion clinica |
| plan | TEXT | P: plan de tratamiento |
| content | TEXT | Nota libre / comentario de biomarcador |
| biomarker_key | TEXT | Biomarcador especifico (ej: "lipids.ldl") |
| protocol_adjustments | JSONB | [{molecule, action: approve/reject/modify, newDose, reason}] |
| diagnoses | TEXT[] | Codigos CIE-10 (ej: ["E11", "E78.0", "I10"]) |

**medico_alerts** (v3.0)
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | UUID PK | Identificador unico |
| medico_user_id | UUID FK -> auth.users | Medico destinatario |
| patient_id | UUID FK -> patients | Paciente relacionado |
| alert_type | TEXT | new_analysis / biomarker_danger / biomarker_worsened |
| level | TEXT | info / warning / danger / critical |
| title | TEXT | Titulo de la alerta |
| read / dismissed | BOOLEAN | Estado de la alerta |

**follow_ups** (v3.0)
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | UUID PK | Identificador unico |
| patient_id | UUID FK -> patients | Paciente |
| medico_user_id | UUID FK -> auth.users | Medico responsable |
| title | TEXT | Descripcion del seguimiento |
| due_date | DATE | Fecha limite |
| status | TEXT | pending / completed / overdue / cancelled |

#### Row Level Security (RLS)

| Tabla | Politica | Regla |
|-------|----------|-------|
| patients | patients_own | user_id = auth.uid() (ALL) |
| medicos | medicos_read | Lectura abierta a autenticados |
| medicos | medicos_write | user_id = auth.uid() (INSERT) |
| medicos | medicos_update | user_id = auth.uid() (UPDATE) |
| patient_medico_links | links_read/insert/update | Abierto a autenticados (filtrado en codigo) |
| lab_results | Owner CRUD | patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()) |
| clinical_notes | Medico manages own | medico_user_id = auth.uid() |
| medico_alerts | Medico manages own | medico_user_id = auth.uid() |
| follow_ups | Medico manages own | medico_user_id = auth.uid() |

---

### 5.5 Motor de Analisis IA + Motor Matematico Deterministico

#### Arquitectura hibrida (v3.0)

Longevity IA v3.0 usa una arquitectura de 2 capas:

**Capa 1 — Claude IA (narrativa):** Extrae biomarcadores de PDFs/imagenes, genera clinicalSummary, keyAlerts, risks y protocol.

**Capa 2 — Motor matematico (deterministico):** Recalcula systemScores, overallScore, longevity_age y proyeccion con funciones matematicas. Los valores de Claude se sobreescriben con calculos reproducibles y auditables.

**Capa 3 — FODA Hibrida (motor + IA):** El motor matematico selecciona QUE biomarcadores entran en el FODA y en QUE ORDEN (determinista, basado en scores sigmoid y pesos de mortalidad). Claude redacta el DETALLE NARRATIVO de cada punto, personalizado con la historia clinica del paciente (ejercicio, dieta, antecedentes familiares, medicamentos, sueno, estres). Si no hay historia clinica o Claude falla, se usa FODA estatica con templates de evidencia como fallback.

```
PDF/Imagen
    │
    ▼
[extractBiomarkers]          ← Llamada 1: Claude (~30-60s)
    │  Extrae: 7 categorias de biomarcadores
    │
    ▼
[GUARDAR parsed_data + Dashboard instantaneo]
    │
    ▼
[reanalyzeWithClinicalHistory]  ← Llamada 2: Claude (~2-5 min)
    │  Genera: clinicalSummary, keyAlerts, risks, protocol
    │
    ▼
[OVERRIDE MATEMATICO]        ← Codigo deterministico (0.1s)
    │  computeAllScores()    → systemScores (funciones sigmoideas)
    │  computePhenoAge()     → longevity_age (Levine 2018)
    │  computeProjection()   → proyeccion (Gompertz)
    │  analyzeWearables()    → ajustes por wearables (si hay datos)
    │  deduplicateProtocol() → eliminar moleculas repetidas
    │
    ▼
[FODA HIBRIDA]               ← Motor + Claude (~10-15s adicionales)
    │  computeFODASkeleton() → seleccion determinista de biomarcadores
    │  enrichFODANarrative() → Claude redacta detalle con historia clinica
    │  fallback:             → computeFODA() si no hay HC o Claude falla
    │
    ▼
[GUARDAR ai_analysis]       ← UPDATE en lab_results
```

#### Motor Matematico: 6 modulos

**1. longevity-scoring.ts — Funciones sigmoideas**
- 30+ funciones continuas 0-100 por biomarcador
- 3 tipos de curva: descendente (LDL), ascendente (HDL), gaussiana (TSH)
- 8 interacciones entre biomarcadores (LDL+PCR, glucosa+insulina, TG+HDL, etc.)
- Pesos calibrados con UK Biobank (500K), NHANES III, Framingham, Copenhagen

**2. longevity-phenoage.ts — Edad biologica**
- Formula PhenoAge (Levine, Aging 2018) con 9 biomarcadores
- 7 modificadores: RDW, albumina, PCR, HbA1c, VitD, GFR, ferritina
- Conversion automatica de unidades (mg/dL → mmol/L)

**3. longevity-foda.ts — FODA Hibrida (motor + IA)**
- Base de conocimiento para 11 biomarcadores con pesos de mortalidad
- Arquitectura de 2 fases:
  - Fase 1 (determinista): computeFODASkeleton() selecciona biomarcadores y orden por score sigmoid + mortalityWeight
  - Fase 2 (narrativa): enrichFODANarrative() en analyzer.ts hace llamada ligera a Claude (~4K tokens, ~10-15s) para redactar detalle personalizado con historia clinica
- Fortalezas = top 4 biomarcadores score >=80 por peso mortalidad
- Debilidades = top 3 biomarcadores score <55
- Oportunidades = intervenciones con evidencia nivel 1-2
- Amenazas = riesgo proyectado por biomarcador + edad + historia familiar
- Fallback automatico: si no hay historia clinica o Claude falla, usa computeFODA() con templates estaticos
- Resultado: seleccion reproducible (siempre los mismos biomarcadores) + redaccion personalizada (diferente para atleta de 30 vs sedentario de 65)

**4. longevity-projection.ts — Proyeccion Gompertz**
- Mortalidad se duplica cada 8 anos (Gompertz 1825)
- 5 niveles de deterioro: 1.5%/ano (optimo) a 10%/ano (critico)
- Mejora terapeutica: 18% ano 1 → 12% → 8% → 4% → 1% (adherencia decae)
- Riesgos por ano derivados de peores sistemas

**5. longevity-wearables.ts — Integracion wearables (preparado)**
- 13 metricas: HR reposo, HRV RMSSD, VO2max, pasos, sueno (duracion + profundo), glucosa CGM (promedio + TIR + CV), PA, SpO2 nocturno, grasa corporal, readiness, temperatura
- Evidencia actualizada 2022-2025 para cada metrica
- Si no hay datos de wearables: zero-impact (no afecta analisis)
- Dispositivos soportados: Apple Watch, Oura Ring, Dexcom CGM, Withings, Garmin, Freestyle Libre

**6. longevity-trends.ts — Tendencias longitudinales**
- Deltas automaticos entre analisis (absolutos y porcentuales)
- Velocidad de cambio mensual
- Proyeccion: meses para alcanzar optimo o danger
- Alertas si empeoramiento >20%

#### Prompt del Sistema (SYSTEM_PROMPT) v3.0

El prompt define la logica propietaria que Claude sigue para generar narrativa:
- Fuentes condensadas de instituciones de nivel mundial
- Estudios clave 2024-2026 (22 estudios verificados)
- Jerarquia de urgencia basada en biomarcadores
- Interacciones farmacologicas (10 pares criticos)
- Contraindicaciones por condicion (7 condiciones)
- Regla de no-duplicacion de moleculas
- hUC-MSC como unica celula madre permitida

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

### 5.6 Catálogo de Biomarcadores

#### Archivos: `src/lib/biomarker-ranges.ts` + `src/types/index.ts` (interfaz Urinalysis)

**164 biomarcadores** en **22 categorías**: 133 sanguíneos + 31 urinarios con rangos de medicina de longevidad.

**Biomarcadores sanguíneos (133):**

| Categoría | Cantidad | Alta Relevancia | Fuentes |
|-----------|:--------:|:---------------:|---------|
| Hematología | 16 | RDW, WBC, NLR | Harrison's |
| Metabolismo (Glucosa) | 4 | Glucosa, HbA1c, Insulina, HOMA-IR | Stanford |
| Metabolismo (Renal) | 5 | Creatinina, TFGe, Ácido Úrico | KDIGO 2024 |
| Lípidos | 8 | LDL, HDL, TG, ApoB, Lp(a) | ACC/AHA |
| Lípidos Avanzados | 4 | sdLDL, ox-LDL, Remanente, No-HDL | Harvard |
| Hepático | 9 | ALT, GGT, Albúmina | AASLD |
| Tiroides | 5 | TSH, FT4, FT3 | Endocrine Society |
| Hormonas | 10 | Testosterona, DHEA-S, Cortisol, IGF-1 | ACOG |
| Hormonas Ampliadas | 4 | Leptina, Adiponectina | Friedman/Barzilai |
| Vitaminas y Minerales | 10 | Vit D, B12, Ferritina, Mg, Zn | Mayo Clinic |
| Vitaminas Ampliadas | 12 | MMA, PTH, Cobre | UpToDate, WHO |
| Inflamación | 5 | PCR-us, Homocisteína, IL-6, TNF-α | Johns Hopkins |
| Electrolitos | 4 | Fósforo | UpToDate |
| Coagulación | 3 | - | UpToDate |
| Cardíaco | 4 | NT-proBNP, Troponina | ACC/AHA |
| Pancreático | 4 | Péptido C | Mayo Clinic |
| Inmunológico | 6 | C3, C4 | Harrison's |
| Marcadores Tumorales | 6 | - | NCCN |
| Longevidad | 4 | Omega-3, CoQ10, Glutatión, NAD+ | Horvath, Blackburn |
| Longevidad Ampliada | 5 | Telómeros, Cistatina C, GDF-15 | UCSF, Baltimore |
| Metabolismo Avanzado | 3 | - | KDIGO, Sepsis |

**Biomarcadores urinarios (31) — interfaz Urinalysis en types/index.ts:**

| Categoría | Biomarcadores | Evidencia 2022-2026 |
|-----------|---------------|---------------------|
| Examen general (10) | pH, densidad, proteínas, glucosa, cetonas, sangre oculta, leucocito esterasa, nitritos, bilirrubina, urobilinógeno | Siener, Urolithiasis 2022 |
| Daño renal temprano (3) | Microalbúmina, ACR (albúmina/creatinina), creatinina urinaria | KDIGO 2024; Bakris, Kidney Int 2024 |
| Sedimento (5) | Eritrocitos, leucocitos, cilindros, cristales, bacterias | — |
| Orina 24h (6) | Ácido úrico, calcio, oxalato, citrato, proteínas, cortisol libre | Ferraro NEJM 2024; Waikar JASN 2022; Fleseriu Lancet 2023 |
| Toxicología (4) | Mercurio, plomo, cadmio, arsénico | Satarug Environ Health 2022; Lanphear Lancet Public Health 2023 |
| Especiales (3) | Catecolaminas/metanefrinas, porfirinas, 5-HIAA | Endocrine Society 2023; Bissell NEJM 2023; Halperin JCO 2023 |

**Integración con el análisis:** Los biomarcadores urinarios complementan el análisis de sangre:
- ACR/microalbuminuria detecta daño renal 5-10 años antes que la creatinina sérica
- Cortisol libre 24h integra producción diaria real (más preciso que cortisol sérico puntual)
- Metales pesados miden carga corporal acumulada (no exposición aguda como sangre)
- Si hay datos urinarios, el score RENAL se ajusta con peso adicional para ACR

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
| SUPABASE_SERVICE_ROLE_KEY | Secreta | Clave admin para operaciones cross-user (motor clinica). Obtener en Supabase > Project Settings > API > service_role. Solo usar server-side. |

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

*Documento generado por Longevity IA v3.0 — Marzo 2026*

*Derechos reservados - Longevity Clinic SA de CV*
