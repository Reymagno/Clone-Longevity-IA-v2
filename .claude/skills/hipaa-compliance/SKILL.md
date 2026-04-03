---
name: hipaa-compliance
description: >
  Especialista en cumplimiento HIPAA para aplicaciones de salud. Usa esta
  skill cuando necesites verificar cumplimiento regulatorio, implementar
  salvaguardas tecnicas, disenar flujos de datos que protejan PHI, auditar
  almacenamiento de datos medicos, o preparar documentacion de compliance.
  Triggers: "HIPAA", "PHI", "datos de salud", "compliance", "regulacion
  medica", "cifrado de datos medicos", "signed URLs", "audit trail",
  "breach notification", "BAA", "LFPDPPP", "datos personales de salud".
---

# HIPAA Compliance — Proteccion de Datos de Salud

Eres un especialista en cumplimiento HIPAA. Evaluas aplicaciones de salud contra los requerimientos tecnicos de la ley y propones implementaciones concretas.

---

## 1. Clasificacion de PHI

Antes de cualquier implementacion, clasificar los datos:

| Categoria | Ejemplos | Nivel de proteccion |
|---|---|---|
| Identificadores directos | Nombre, email, fecha nacimiento, telefono | Maximo — cifrado + acceso restringido |
| Datos clinicos | Biomarcadores, diagnosticos, medicamentos, notas SOAP | Maximo — cifrado + auditoria |
| Datos derivados | Scores de IA, protocolos generados, proyecciones | Alto — acceso controlado |
| Datos operativos | Codigos de paciente, timestamps, metadata | Medio — no exponer en logs publicos |
| Datos no-PHI | Preferencias de UI, configuracion, avatares | Bajo — proteccion estandar |

---

## 2. Salvaguardas Tecnicas Requeridas (§164.312)

### (a)(1) Control de Acceso
- Autenticacion obligatoria para acceder a PHI
- Roles diferenciados (paciente/medico/clinica)
- Ownership verification en cada operacion
- MFA recomendado para cuentas con acceso a multiples pacientes

### (a)(2)(iv) Cifrado
- En reposo: AES-256 para base de datos y archivos
- En transito: TLS 1.3 para todas las conexiones
- Claves de API en variables de entorno server-side (nunca NEXT_PUBLIC_)

### (b) Controles de Auditoria
- Registrar: quien accedio, que dato, cuando, desde donde
- Logs inmutables (solo service role puede escribir)
- Retencion minima: 6 anos (requerimiento HIPAA)

### (c)(1) Integridad
- Hashes de archivos para detectar alteraciones
- Foreign keys para integridad referencial
- Validacion de input en cada endpoint

### (d) Autenticacion de Persona
- Email/password como minimo
- MFA TOTP como segundo factor
- JWT con expiracion y refresh automatico

### (e)(1) Seguridad en Transmision
- HTTPS obligatorio (redirect HTTP → HTTPS)
- SSL para conexiones a base de datos
- Headers de seguridad (HSTS, X-Frame-Options, etc.)

---

## 3. Almacenamiento de Archivos Medicos

### Regla: Nunca URLs publicas para PHI

```
INCORRECTO:
archivo.pdf → supabase.storage.getPublicUrl() → URL permanente y publica

CORRECTO:
archivo.pdf → guardar solo el path → generar signed URL temporal bajo demanda
```

### Implementacion:
1. Buckets en modo PRIVADO (no public)
2. Subir archivo y guardar solo el path en la BD
3. API endpoint que verifica auth + ownership → genera signed URL (1h)
4. El frontend solicita la URL cada vez que necesita mostrar el archivo

---

## 4. BAA (Business Associate Agreements)

Todo proveedor que procese PHI necesita un BAA firmado:

| Proveedor | Que procesa | Plan requerido |
|---|---|---|
| Supabase | BD + Storage + Auth | Pro o superior |
| Vercel | API Routes con PHI en memoria | Enterprise |
| Anthropic | Texto clinico para analisis IA | Enterprise |
| OpenAI | Audio de consultas para transcripcion | Enterprise |

### Accion: Contactar a cada proveedor y solicitar el BAA antes de operar con datos reales de pacientes.

---

## 5. Notificacion de Brechas (§164.404-408)

### Timeline obligatorio:
- **Deteccion → 60 dias**: Notificar a pacientes afectados
- **Si afecta 500+ personas**: Notificar al HHS y medios de comunicacion
- **Documentar**: Que datos, cuantos afectados, que se hizo para remediar

### Capacidades de deteccion necesarias:
- Audit logs con queries para detectar patrones anomalos
- Alertas por accesos fuera de horario
- Alertas por volumen inusual de accesos a pacientes
- Capacidad de identificar exactamente que datos fueron expuestos

---

## 6. Checklist de Compliance

### Antes de lanzar a produccion:
- [ ] Todos los buckets con PHI son privados
- [ ] Cifrado en reposo verificado (Supabase dashboard)
- [ ] HTTPS obligatorio (verificar redirect)
- [ ] MFA disponible para todos los usuarios
- [ ] Audit logs funcionando (verificar con query)
- [ ] RLS habilitado en TODAS las tablas
- [ ] No hay console.log con PHI en produccion
- [ ] Variables de entorno sensibles son server-only (sin NEXT_PUBLIC_)
- [ ] BAA firmado con cada proveedor
- [ ] Politica de privacidad publicada
- [ ] Proceso de notificacion de brechas documentado
- [ ] Backup automatico verificado
- [ ] Plan de retencion de datos definido (minimo 6 anos)
