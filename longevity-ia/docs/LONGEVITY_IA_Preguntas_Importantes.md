# LONGEVITY IA - Preguntas Importantes y Respuestas Ejecutivas

**Documento confidencial | Longevity Clinic SA de CV**
**Version:** 1.1
**Fecha:** 31 de marzo de 2026
**Clasificacion:** Interno - Ejecutivo

---

## Indice

1. [Compatibilidad de funcionalidades con analisis existentes](#1-compatibilidad-de-funcionalidades-con-analisis-existentes)
2. [Efectividad: IA vs Motor Matematico](#2-efectividad-ia-vs-motor-matematico)
3. [Como genera Claude el protocolo personalizado](#3-como-genera-claude-el-protocolo-personalizado)
4. [Por que el FODA no lo genera Claude](#4-por-que-el-foda-no-lo-genera-claude)

---

## 1. Compatibilidad de funcionalidades con analisis existentes

**Pregunta:** Las nuevas funcionalidades de herramientas para medicos y funciones, se visualizan en analisis de pacientes ya creados o se deben hacer analisis nuevos?

### Respuesta

Las funcionalidades se dividen en dos categorias segun su compatibilidad con analisis previos:

### Funcionalidades visibles en analisis YA existentes (sin re-analizar)

| Funcionalidad | Razon |
|---|---|
| Notas Clinicas SOAP | Son independientes del analisis, se guardan por paciente |
| Pie de metodologia | Es texto UI estatico, siempre aparece en el dashboard |
| Boton de eliminar analisis | Opera directamente sobre la base de datos |
| Copyright "Derechos reservados" | Elemento visual estatico en todas las paginas |
| Datos del paciente en invitaciones | Lee datos actuales de la tabla de pacientes |
| Referencias verificadas con abstracts | Se buscan on-demand via APIs externas |

### Funcionalidades disponibles SOLO en analisis nuevos

| Funcionalidad | Razon |
|---|---|
| Motor matematico (sigmoid scores, PhenoAge, FODA computado, Gompertz) | Se calcula al momento de crear el analisis y se almacena en BD |
| Deduplicacion de protocolo | Se aplica durante la generacion del protocolo |
| Integracion de wearables | Se procesa al momento del analisis |
| Interacciones farmacologicas y contraindicaciones | Se verifican durante la generacion del protocolo |
| Jerarquia de urgencia por biomarcador | Se asigna durante la generacion del protocolo |

### Solucion para pacientes existentes

Para que un paciente existente tenga las mejoras del motor matematico, el medico puede usar el boton **"Re-analizar"** en el dashboard del paciente. Esta funcion ejecuta `reanalyzePartial()`, que aplica el motor matematico completo sobre los biomarcadores ya extraidos, sin necesidad de volver a subir el documento de laboratorio.

---

## 2. Efectividad: IA vs Motor Matematico

**Pregunta:** Que es mas efectivo: que la IA de Claude Sonnet 4.6 decida los scores, haga el FODA y la proyeccion, o el nuevo motor matematico?

### Respuesta

El motor matematico es significativamente mas efectivo para calculos numericos. La arquitectura optima es la hibrida que Longevity IA implementa actualmente.

### Comparativa: Claude solo (IA pura)

| Aspecto | Evaluacion |
|---|---|
| Determinismo | **No determinista**: el mismo paciente puede recibir scores diferentes cada vez |
| Calibracion | **Sin calibracion**: Claude no tiene acceso a curvas de distribucion poblacional (UK Biobank, NHANES, Framingham) |
| Sesgo | **Sesgo de texto**: tiende a dar scores "redondos" (70, 75, 80) y evita extremos |
| FODA | **Generico**: genera fortalezas/debilidades basadas en patrones de lenguaje, no en umbrales clinicos validados |
| Proyeccion | **Inventada**: sin modelo actuarial, la curva a 10 anios es una narrativa, no un calculo |

### Comparativa: Motor Matematico

| Aspecto | Evaluacion |
|---|---|
| Determinismo | **Determinista y reproducible**: mismos labs = mismo resultado, siempre |
| Calibracion | **Calibrado con evidencia**: sigmoides ajustadas a rangos de UK Biobank, NHANES III, Framingham |
| Edad biologica | **PhenoAge validado**: formula de Levine 2018, publicada en Aging, con 9 biomarcadores especificos |
| FODA | **Basado en umbrales**: cada biomarcador tiene rangos concretos de fortaleza/debilidad con peso de mortalidad |
| Proyeccion | **Gompertz real**: modelo actuarial de mortalidad usado en seguros y epidemiologia desde 1825 |
| Interacciones | **Detecta sinergias**: LDL+CRP, calcula HOMA-IR de glucosa+insulina, TG+HDL, etc. |

### Comparativa final: Tres arquitecturas

| Aspecto | Solo Claude | Solo Motor | Hibrido (Longevity IA) |
|---|---|---|---|
| Precision numerica | Baja | Alta | **Alta** |
| Reproducibilidad | Baja | Total | **Total** |
| Contexto clinico | Alto | Nulo | **Alto** |
| Protocolo personalizado | Excelente | No aplica | **Excelente** |
| Auditable | No | Si | **Si** |
| Costo regulatorio | Alto riesgo | Bajo riesgo | **Bajo riesgo** |

### Conclusion

La arquitectura hibrida es la correcta: cada componente hace lo que mejor sabe hacer. Claude genera la narrativa clinica y el protocolo personalizado (razonamiento complejo, contexto del paciente, evidencia medica). El motor matematico calcula los numeros (scores, edad biologica, FODA, proyeccion) con funciones deterministas y calibradas.

---

## 3. Como genera Claude el protocolo personalizado

**Pregunta:** Como hace Claude el protocolo?

### Respuesta

El protocolo se genera en un proceso de tres fases: input, procesamiento por Claude, y post-procesamiento por codigo.

### Fase 1: Input (lo que recibe Claude)

Claude recibe tres bloques de informacion:

| Bloque | Contenido | Tokens aprox. |
|---|---|---|
| **SYSTEM_PROMPT** | Reglas, fuentes de conocimiento, estudios 2024-2026, whitelist de intervenciones, interacciones farmacologicas, contraindicaciones | ~5,000 |
| **Historia clinica** | Peso, alergias, medicamentos actuales, ejercicio, suenio, estres, antecedentes familiares, condiciones cronicas | Variable |
| **Documento de laboratorio** | PDF o imagen con resultados de sangre del paciente | Variable |

### Fase 2: Procesamiento por Claude

**a) Extraccion de biomarcadores**

Claude lee el documento de laboratorio y estructura cada biomarcador en formato JSON con: valor numerico, unidad, rangos de referencia convencional y rangos optimos de longevidad (mas estrictos).

**b) Seleccion de intervenciones**

Claude selecciona del whitelist (~120 moleculas en 13 categorias) aplicando esta logica:

| Regla | Ejemplo |
|---|---|
| Solo moleculas justificadas por biomarcador alterado | LDL alto → incluir Berberina; LDL optimo → no incluir |
| Verificar interacciones farmacologicas (10 pares) | NO combinar Omega-3 altas dosis + Nattokinasa (riesgo sangrado) |
| Verificar contraindicaciones por condicion (7 condiciones) | GFR <45 → excluir metformina, creatina, magnesio |
| Respetar alergias del paciente | Marcadas con alerta en la historia clinica |
| No duplicar suplementos que el paciente ya toma | Listados en historia clinica como suplementos actuales |
| Asignar urgencia por severidad del biomarcador | immediate / high / medium / low |

**c) Estructura de cada molecula del protocolo**

Para cada intervencion seleccionada, Claude genera:

| Campo | Descripcion | Ejemplo |
|---|---|---|
| `category` | Categoria terapeutica | Suplementacion, Farmacologico, Senolitico |
| `molecule` | Nombre especifico con forma | Curcumina liposomal |
| `dose` | Dosis estandarizada | 500mg 2x/dia |
| `mechanism` | Mecanismo de accion vinculado al biomarcador | Inhibe NF-kB, reduce PCR via COX-2 |
| `evidence` | Autor, revista, anio, magnitud del efecto | Hewlings, Foods, 2017: PCR -20% |
| `clinicalTrial` | Nombre del ensayo clinico o cita | Sin ensayo nombrado - evidencia: Hewlings 2017 |
| `targetBiomarkers` | Biomarcadores objetivo | ["crp", "homocysteine"] |
| `expectedResult` | Resultado esperado cuantificado | Reduccion de PCR de 3.2 a <1.0 mg/L en 8-12 semanas |
| `urgency` | Nivel de urgencia | high |

### Fase 3: Post-procesamiento (codigo)

Despues de que Claude devuelve el JSON, el codigo ejecuta tres operaciones:

| Operacion | Descripcion |
|---|---|
| **Validacion estricta** | Cada campo se valida: tipos de datos, rangos permitidos, valores validos. Campos faltantes reciben valores por defecto seguros |
| **Deduplicacion** | `canonicalMolecule()` normaliza nombres (CoQ10 = Ubiquinol = Coenzima Q10) y elimina apariciones repetidas, conservando la primera |
| **Override matematico** | Los scores, edad biologica, FODA y proyeccion se sobreescriben con el motor matematico. El protocolo y la narrativa clinica se conservan tal como Claude los genero |

### Resumen de responsabilidades

| Componente | Responsable | Justificacion |
|---|---|---|
| Extraccion de biomarcadores | Claude | Lectura de PDFs/imagenes, OCR implicito, interpretacion de formatos variables |
| Protocolo personalizado | Claude | Razonamiento clinico, cruce de evidencia con contexto del paciente |
| Narrativa clinica (resumen, alertas) | Claude | Lenguaje natural, interpretacion integrada, comunicacion medica |
| Scores numericos por sistema | Motor matematico | Reproducibilidad total, calibracion con datos poblacionales |
| Edad biologica | Motor matematico (PhenoAge) | Formula validada Levine 2018, 9 biomarcadores especificos |
| FODA medica | Motor matematico | Consistencia, umbrales objetivos, pesos de mortalidad |
| Proyeccion a 10 anios | Motor matematico (Gompertz) | Modelo actuarial determinista con curvas de intervencion |

**Analogia ejecutiva:** Claude es el "medico que razona y prescribe". El motor matematico es el "laboratorio que mide y calcula".

---

## 4. Por que el FODA no lo genera Claude

**Pregunta:** Por que el FODA no lo hace Claude tambien?

### Respuesta

Claude si genera un FODA como parte de su respuesta. Sin embargo, el sistema lo sobreescribe con el motor matematico por cuatro razones fundamentales:

### Problemas del FODA generado por Claude

| Problema | Descripcion | Impacto |
|---|---|---|
| **No reproducible** | El mismo paciente con los mismos labs puede recibir un FODA diferente cada vez. Claude podria poner "HDL alto" como fortaleza en un analisis y omitirlo en otro | Inconsistencia entre analisis del mismo paciente |
| **Sesgo narrativo** | Claude tiende a generar FODAs "balanceados": siempre busca algo positivo aunque el paciente este critico, o exagera amenazas en un paciente sano. Es un sesgo del modelo de lenguaje que prefiere respuestas equilibradas | Evaluacion no objetiva del estado real del paciente |
| **Desconexion con scores** | Claude podria decir "sistema cardiovascular es una fortaleza" pero haber puesto un score cardiovascular de 62. El FODA no estaba vinculado matematicamente a los scores | Contradicciones internas en el analisis |
| **Priorizacion arbitraria** | Que es mas importante como debilidad: LDL de 180 o vitamina D de 25? Claude decide por "intuicion linguistica". El motor usa pesos de mortalidad calibrados | Priorizacion clinicamente incorrecta |

### Comparativa directa: Motor vs Claude en FODA

| Aspecto | Claude FODA | Motor FODA |
|---|---|---|
| LDL 180 es debilidad? | "Probablemente si" | Si: score sigmoid = 28/100, mortalityWeight = 0.25 |
| Cual debilidad va primero? | La que suene mas grave | La de mayor mortalityWeight x desviacion del optimo |
| Es fortaleza o no? | Depende del dia | score > 80 = fortaleza, siempre |
| Cuantas fortalezas? | 2 a 6, variable | 4 exactas, las mejores por score |
| Vinculado a scores? | No necesariamente | Si, directamente derivado de los mismos scores |

### El argumento a favor de Claude

Claude puede generar contexto narrativo que el motor no puede:

| Fuente | Ejemplo de output para HDL 72 mg/dL |
|---|---|
| **Motor matematico** | HDL 72 mg/dL - score 88/100, fortaleza |
| **Claude** | HDL 72 mg/dL - proteccion endotelial activa, consistente con su rutina de ejercicio Zone 2 reportada en historia clinica (Barter, NEJM 2007: +1 mg/dL HDL = -2% riesgo CV) |

### Solucion implementada: FODA Hibrida v3.0

Se implemento la arquitectura hibrida que combina lo mejor de ambos mundos:

| Fase | Responsable | Funcion | Tiempo |
|---|---|---|---|
| Seleccion de biomarcadores | Motor matematico | Determinista: scores sigmoid + pesos de mortalidad | <0.1s |
| Orden de prioridad | Motor matematico | Reproducible: mortalityWeight x desviacion del optimo | <0.1s |
| Redaccion narrativa | Claude Sonnet 4.6 | Contextualizada con historia clinica completa del paciente | ~10-15s |
| Fallback | Motor matematico | Templates estaticos si no hay HC o Claude falla | <0.1s |

Flujo tecnico:
1. `computeFODASkeleton()` genera un skeleton con: biomarcador, valor, score, peso mortalidad, categoria, templates base
2. `enrichFODANarrative()` envia el skeleton + historia clinica a Claude con max 4K tokens
3. Claude redacta `detail`, `evidence`, `expectedImpact`/`probability` personalizado para cada punto
4. `mergeNarrativeWithSkeleton()` combina la narrativa de Claude con los datos numericos del motor
5. Si Claude falla: `computeFODA()` genera FODA estatica con templates preconfigurados

Resultado: el mismo paciente con los mismos labs siempre tendra los mismos biomarcadores en el FODA (reproducible), pero la redaccion estara personalizada segun su ejercicio, dieta, antecedentes familiares, medicamentos, sueno y estres.

---

## Glosario tecnico

| Termino | Definicion |
|---|---|
| **Sigmoid scoring** | Funcion matematica que mapea valores de biomarcadores a scores 0-100 con transiciones suaves entre rangos |
| **PhenoAge** | Formula de edad biologica publicada por Levine (2018) en la revista Aging, basada en 9 biomarcadores sanguineos |
| **Gompertz** | Modelo matematico de mortalidad (1825) que describe el aumento exponencial del riesgo de muerte con la edad |
| **FODA** | Fortalezas, Oportunidades, Debilidades y Amenazas - adaptado al contexto medico de biomarcadores |
| **Whitelist** | Lista cerrada de ~120 moleculas aprobadas de las cuales Claude puede seleccionar intervenciones |
| **Override matematico** | Proceso donde el codigo sobreescribe los calculos numericos de Claude con funciones deterministas |
| **UK Biobank** | Base de datos de ~500,000 participantes del Reino Unido con datos genomicos, de laboratorio y seguimiento a largo plazo |
| **NHANES III** | Tercera Encuesta Nacional de Examen de Salud y Nutricion de EE.UU., fuente de rangos de referencia poblacionales |
| **Framingham** | Estudio cardiologico longitudinal iniciado en 1948, base de las formulas de riesgo cardiovascular |
| **HOMA-IR** | Homeostatic Model Assessment for Insulin Resistance, calculo de resistencia a la insulina a partir de glucosa e insulina en ayunas |
| **hUC-MSC** | Human Umbilical Cord Mesenchymal Stem Cells, unicas celulas madre permitidas en el protocolo de Longevity IA |

---

**Derechos reservados - Longevity Clinic SA de CV**
*Documento generado por Longevity IA v3.0*
