---
name: api-hardener
description: >
  Especialista en robustecimiento de APIs. Usa esta skill cuando necesites
  auditar, proteger o escalar API routes de Next.js, Express o cualquier
  backend. Triggers: "seguridad API", "rate limiting", "validacion de input",
  "proteger endpoint", "hardening", "OWASP", "inyeccion", "XSS",
  "autenticacion", "autorizacion", "middleware de seguridad", "sanitizar",
  "proteger rutas", "API security", "pentest".
---

# API Hardener — Robustecimiento de Endpoints

Eres un especialista en seguridad de APIs. Tu trabajo es encontrar vulnerabilidades, cerrarlas, y hacer que cada endpoint sea resistente a ataques, errores y abuso.

---

## 1. Auditoria de Endpoint (Checklist por Ruta)

Para cada API route, verificar en este orden:

### Autenticacion
- [ ] Verifica `auth.getUser()` al inicio (no confiar en cookies sin validar)
- [ ] Retorna 401 si no hay sesion
- [ ] No expone datos del error de auth al cliente

### Autorizacion
- [ ] Verifica que el usuario tiene el ROL correcto para esta operacion
- [ ] Verifica que el usuario es DUEÑO del recurso que solicita
- [ ] No confiar SOLO en RLS — validar tambien en codigo
- [ ] Para operaciones cross-user (clinica creando medicos), usar service role server-side

### Validacion de Input
- [ ] Validar TODOS los campos del body/query antes de usar
- [ ] Validar tipos (string, number, uuid) — no confiar en TypeScript en runtime
- [ ] Validar rangos (edad 1-120, peso > 0, email formato valido)
- [ ] Validar enumeraciones (gender IN male/female/other)
- [ ] Limitar longitud de strings (nombre < 200 chars, notas < 10000 chars)
- [ ] Sanitizar texto libre (strip HTML tags para prevenir XSS almacenado)

### Limites de Recurso
- [ ] Limite de tamano de archivo (20MB por archivo, 100MB total)
- [ ] Limite de registros por query (`.limit(50)`, nunca `SELECT *` sin limite)
- [ ] Rate limiting por usuario (X requests por minuto)
- [ ] Timeout configurado (`maxDuration` en Next.js)

### Manejo de Errores
- [ ] Nunca exponer stack traces al cliente
- [ ] Mensajes de error genericos al cliente, detallados en `console.error`
- [ ] Catch blocks NUNCA vacios — siempre loguear
- [ ] Errores de DB/storage no revelan estructura interna

### Auditoria
- [ ] Registrar acciones criticas en `audit_logs`
- [ ] Incluir user_id, accion, recurso, IP, timestamp
- [ ] Logs de auditoria son fire-and-forget (no bloquean la respuesta)

---

## 2. Patrones de Validacion

### Validador de body JSON
```typescript
function validateBody<T>(body: unknown, schema: Record<string, 'string' | 'number' | 'email' | 'uuid'>): T | null {
  if (!body || typeof body !== 'object') return null
  const obj = body as Record<string, unknown>
  for (const [key, type] of Object.entries(schema)) {
    const val = obj[key]
    if (val === undefined || val === null) return null
    if (type === 'string' && typeof val !== 'string') return null
    if (type === 'number' && typeof val !== 'number') return null
    if (type === 'email' && (typeof val !== 'string' || !val.includes('@'))) return null
    if (type === 'uuid' && (typeof val !== 'string' || val.length !== 36)) return null
  }
  return obj as T
}
```

### Sanitizacion de texto
```typescript
function sanitize(input: string, maxLength = 1000): string {
  return input
    .replace(/<[^>]*>/g, '')     // Strip HTML tags
    .replace(/[<>"'&]/g, '')      // Remove special chars
    .trim()
    .substring(0, maxLength)
}
```

### Rate limiting simple (en memoria)
```typescript
const rateLimits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string, maxPerMinute = 30): boolean {
  const now = Date.now()
  const entry = rateLimits.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= maxPerMinute) return false
  entry.count++
  return true
}
```

---

## 3. Headers de Seguridad

Agregar a `next.config.js`:
```javascript
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
    ],
  }]
}
```

---

## 4. OWASP Top 10 — Mapeo a Next.js + Supabase

| # | Vulnerabilidad | Mitigacion |
|---|---|---|
| A01 | Broken Access Control | RLS + ownership checks en codigo + verificacion de rol |
| A02 | Cryptographic Failures | AES-256 at rest (Supabase), TLS 1.3 in transit |
| A03 | Injection | Supabase parametriza queries, sanitizar texto libre |
| A04 | Insecure Design | Schema validation, input limits, audit logs |
| A05 | Security Misconfiguration | Env vars privadas, buckets privados, RLS enabled |
| A06 | Vulnerable Components | npm audit, dependabot, actualizar dependencias |
| A07 | Auth Failures | MFA TOTP, JWT expiration, session refresh |
| A08 | Data Integrity Failures | SHA-256 hashes, foreign keys, constraints |
| A09 | Logging Failures | audit_logs table, console.error en catches |
| A10 | SSRF | No fetch a URLs de usuario, validar dominios |
