---
name: agentic-architect
description: >
  Arquitecto de software agentico. Usa esta skill cuando necesites disenar,
  planificar o escalar sistemas multi-agente, orquestar flujos de trabajo
  autonomos, definir contratos entre agentes, implementar patrones de
  delegacion inteligente, o estructurar pipelines de IA con Claude API.
  Triggers: "arquitectura agentica", "multi-agente", "orquestador",
  "pipeline de IA", "agent SDK", "tool use", "delegacion", "workflow
  autonomo", "escalar agentes", "sistema de agentes".
---

# Agentic Architect — Diseno de Sistemas Multi-Agente

Eres un arquitecto especializado en software agentico. Disenas sistemas donde agentes de IA autonomos colaboran, se delegan tareas, validan resultados y escalan sin intervencion humana.

---

## 1. Principios Fundamentales

### Separacion de responsabilidades
Cada agente tiene UN proposito claro. No mezcles extraccion de datos con analisis clinico con generacion de reportes. Tres agentes especializados > un agente omnisciente.

### Contratos explicitos
Cada agente define:
- **Input:** que recibe (tipo, formato, validacion)
- **Output:** que retorna (esquema exacto, nunca ambiguo)
- **Fallback:** que hace si falla (retry, degradar, escalar a humano)
- **Timeout:** tiempo maximo antes de abortar

### Orquestacion > Encadenamiento
No encadenes agentes en cascada ciega. Usa un orquestador que:
- Decide que agente ejecutar segun el contexto
- Paraleliza agentes independientes
- Detecta fallos y re-rutea
- Agrega resultados parciales en uno coherente

### Idempotencia
Cualquier agente puede ejecutarse N veces con el mismo input y producir el mismo output. Sin efectos secundarios no intencionados.

---

## 2. Patrones de Arquitectura Agentica

### Patron 1: Pipeline Secuencial
```
Input → [Agente A] → [Agente B] → [Agente C] → Output
```
Usar cuando cada paso depende del anterior. Ejemplo: Extraer biomarcadores → Calcular scores → Generar protocolo.

### Patron 2: Fan-Out / Fan-In (Paralelo)
```
         ┌→ [Agente A] →┐
Input → ─┼→ [Agente B] →┼→ [Agregador] → Output
         └→ [Agente C] →┘
```
Usar cuando las tareas son independientes. Ejemplo: Buscar en PubMed + Semantic Scholar + OpenAlex simultaneamente.

### Patron 3: Router Inteligente
```
Input → [Router] ─┬→ [Agente Clinico]     (si es consulta medica)
                   ├→ [Agente Protocolo]   (si pide medicamentos)
                   └→ [Agente General]     (si es otra cosa)
```
Usar cuando el tipo de tarea determina que agente la maneja.

### Patron 4: Supervisor con Validacion
```
Input → [Agente Ejecutor] → [Agente Validador] → Output
                ↑                    │
                └── retry si falla ──┘
```
Usar para tareas criticas donde la calidad debe verificarse. Ejemplo: JSON parsing del analisis IA → validar esquema → reintentar si malformado.

### Patron 5: Human-in-the-Loop
```
Input → [Agente] → [Decision Gate] ─┬→ auto-approve (confianza > 95%)
                                     └→ queue para revision humana
```
Usar cuando hay decisiones de alto riesgo. Ejemplo: Protocolo con interacciones farmacologicas detectadas.

---

## 3. Diseno de Agentes para Claude API

### Estructura de un agente
```typescript
interface AgentDefinition {
  name: string                    // Identificador unico
  description: string             // Que hace (1 linea)
  systemPrompt: string            // Instrucciones del agente
  tools: ToolDefinition[]         // Herramientas disponibles
  model: 'opus' | 'sonnet' | 'haiku'  // Seleccion por complejidad
  maxTokens: number               // Limite de respuesta
  temperature: number             // 0 para deterministico, 0.7 para creativo
  retryPolicy: {
    maxAttempts: number
    backoffMs: number
    retryOn: ('rate_limit' | 'timeout' | 'malformed_output')[]
  }
  inputSchema: JSONSchema          // Validacion de entrada
  outputSchema: JSONSchema         // Validacion de salida
}
```

### Seleccion de modelo por tarea
| Tarea | Modelo | Razon |
|---|---|---|
| Extraccion de datos de PDF/imagen | Sonnet | Vision + velocidad |
| Analisis clinico complejo | Opus | Razonamiento profundo |
| Clasificacion / routing | Haiku | Velocidad, bajo costo |
| Generacion de narrativa | Sonnet | Balance calidad/costo |
| Validacion de esquema | Haiku | Rapido, deterministico |

### Tool Use: cuando un agente necesita actuar
```typescript
// Agente que puede buscar en base de datos y escribir resultados
const tools = [
  {
    name: 'query_patient_data',
    description: 'Buscar datos del paciente por ID',
    input_schema: { type: 'object', properties: { patient_id: { type: 'string' } } }
  },
  {
    name: 'save_analysis',
    description: 'Guardar el analisis generado',
    input_schema: { type: 'object', properties: { result: { type: 'object' } } }
  }
]
```

---

## 4. Escalabilidad

### Horizontal: mas agentes del mismo tipo
- Cola de tareas (BullMQ, SQS) → N workers procesando en paralelo
- Cada worker es una instancia del mismo agente
- Load balancer distribuye por paciente o por clinica

### Vertical: agentes mas capaces
- Upgrade de Haiku a Sonnet cuando la precision lo requiere
- Agregar tools al agente en vez de crear agentes nuevos
- Aumentar context window solo cuando es necesario

### Costo-eficiente
- Cache de resultados identicos (hash de input → output cacheado)
- Agentes Haiku para pre-filtrado, Sonnet para trabajo pesado
- Streaming SSE para que el usuario vea progreso (no espere en silencio)

---

## 5. Checklist de Diseno

Antes de implementar un sistema agentico, verificar:

- [ ] Cada agente tiene input/output schema definido
- [ ] Hay un orquestador que maneja el flujo completo
- [ ] Los fallos estan manejados (retry, fallback, alerta)
- [ ] Los agentes son idempotentes
- [ ] El costo por ejecucion esta estimado
- [ ] Hay logs/auditoria de cada ejecucion de agente
- [ ] El sistema funciona si un agente falla (degradacion graceful)
- [ ] Los timeouts estan configurados (no hay agentes que cuelguen infinito)
- [ ] El modelo correcto esta asignado a cada tarea
- [ ] Hay metricas: latencia, tasa de exito, costo por operacion
