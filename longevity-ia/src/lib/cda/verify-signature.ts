/**
 * LONGEVITY IA — Verificación de Firma Electrónica
 *
 * Verifica la integridad de prescripciones firmadas.
 * La verificación completa de la cadena de certificación
 * requiere validación server-side contra OCSP/CRL.
 */

export interface VerificationResult {
  isValid: boolean
  documentId: string
  verificationCode: string
  signedAt: string
  signerName: string
  signerLicense: string
  signerSpecialty: string
  certificateSerial: string
  certificateIssuer: string
  certificateValidFrom: string
  certificateValidTo: string
  isCertificateExpired: boolean
  digestMatch: boolean
  patientName: string
  patientAge: number
  itemCount: number
  rfc?: string
}

/**
 * Verify that a stored hash matches the cadena original.
 */
export async function verifyDigest(
  cadenaOriginal: string,
  storedHash: string,
): Promise<boolean> {
  const { hashSHA256 } = await import('./prescription-cda')
  const computed = await hashSHA256(cadenaOriginal)
  return computed === storedHash
}

/**
 * Check if a certificate is within its validity period.
 */
export function isCertificateValid(validFrom: string, validTo: string): boolean {
  const now = new Date()
  return now >= new Date(validFrom) && now <= new Date(validTo)
}
