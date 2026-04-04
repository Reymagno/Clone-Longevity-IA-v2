/**
 * Steps de validación con Zod.
 * Schemas reutilizables para todos los endpoints.
 */

import { z } from 'zod'
import { NextResponse } from 'next/server'

// ── Schemas comunes ─────────────────────────────────────────────────

export const patientCreateSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(200),
  age: z.number().int().min(1).max(120),
  gender: z.enum(['male', 'female', 'other']),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  notes: z.string().max(2000).optional(),
  medico_user_id: z.string().uuid().optional(),
})

export const medicoCreateSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  full_name: z.string().min(1, 'Nombre requerido').max(200),
  specialty: z.string().min(1, 'Especialidad requerida').max(200),
  license_number: z.string().min(1, 'Cédula requerida').max(50),
})

export const clinicSettingsSchema = z.object({
  clinic_name: z.string().min(1).max(200).optional(),
  rfc: z.string().max(20).optional(),
  contact_email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  director_name: z.string().max(200).optional(),
  logo_url: z.string().url().optional(),
}).refine(data => Object.values(data).some(v => v !== undefined), {
  message: 'Al menos un campo requerido',
})

export const linkActionSchema = z.object({
  linkId: z.string().uuid('linkId inválido'),
  action: z.enum(['accept', 'reject']),
})

export const alertActionSchema = z.object({
  alertIds: z.array(z.string().uuid()).optional(),
  action: z.enum(['read', 'dismiss', 'dismiss_all']),
})

export const fileUploadRules = z.object({
  maxSizeBytes: z.number().default(20 * 1024 * 1024), // 20MB
  maxTotalBytes: z.number().default(100 * 1024 * 1024), // 100MB
  allowedTypes: z.array(z.string()).default([
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  ]),
})

// ── Validador genérico ──────────────────────────────────────────────

/**
 * Valida datos contra un schema Zod.
 * Retorna los datos parseados si válidos, o NextResponse con error 400.
 */
export function validateInput<T>(
  schema: z.ZodType<T>,
  data: unknown,
): T | NextResponse {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
    return NextResponse.json({ error: 'Validación fallida', details: errors }, { status: 400 })
  }
  return result.data
}

/** Type guard */
export function isValidationError<T>(result: T | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}
