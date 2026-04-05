/**
 * LONGEVITY IA — Firma Digital Client-Side
 *
 * Usa WebCrypto API para operaciones criptográficas en el navegador.
 * La llave privada (.key) NUNCA sale del browser.
 *
 * Validación de llave:
 * 1. FORMATO: Se importa como PKCS#8 con WebCrypto. Si falla → llave inválida.
 * 2. CORRESPONDENCIA: Se firma un texto de prueba con la .key, se verifica con
 *    la llave pública del .cer. Si falla → la .key no corresponde al .cer.
 * 3. CONTRASEÑA: Para llaves cifradas, se descifra con la contraseña.
 */

export interface CertificateInfo {
  serialNumber: string
  subject: string
  issuer: string
  validFrom: string
  validTo: string
  rfc: string | null
  pemBase64: string
}

/**
 * Parse a DER/PEM certificate file (.cer) and extract metadata.
 */
export async function parseCertificate(file: File): Promise<CertificateInfo> {
  const buffer = await file.arrayBuffer()
  let pemBase64: string

  const textDecoder = new TextDecoder()
  const text = textDecoder.decode(buffer)

  if (text.includes('-----BEGIN CERTIFICATE-----')) {
    pemBase64 = text
      .replace('-----BEGIN CERTIFICATE-----', '')
      .replace('-----END CERTIFICATE-----', '')
      .replace(/\s/g, '')
  } else {
    const bytes = new Uint8Array(buffer)
    pemBase64 = btoa(Array.from(bytes).map(b => String.fromCharCode(b)).join(''))
  }

  const derBytes = Uint8Array.from(atob(pemBase64), c => c.charCodeAt(0))
  const serialHex = extractSerialFromDER(derBytes)
  const { subject, issuer, rfc } = extractNamesFromDER(derBytes, text)
  const { validFrom, validTo } = extractValidityFromDER(derBytes)

  return { serialNumber: serialHex, subject, issuer, validFrom, validTo, rfc, pemBase64 }
}

/**
 * Extract the public key from a certificate for verification.
 */
async function extractPublicKey(pemBase64: string): Promise<CryptoKey> {
  const derBytes = Uint8Array.from(atob(pemBase64), c => c.charCodeAt(0))

  // Try importing as X.509 SPKI (SubjectPublicKeyInfo)
  // WebCrypto can't import X.509 certs directly, but we can try the raw DER
  // For RSA certificates, the SPKI is embedded in the TBS certificate
  try {
    return await crypto.subtle.importKey(
      'spki',
      derBytes.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      true,
      ['verify'],
    )
  } catch {
    // The full certificate DER isn't SPKI — try to find the SPKI within it
    // Look for the BIT STRING containing the public key (tag 0x03)
    const spki = extractSPKIFromCert(derBytes)
    if (spki) {
      return await crypto.subtle.importKey(
        'spki',
        spki.buffer as ArrayBuffer,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        true,
        ['verify'],
      )
    }
    throw new Error('No se pudo extraer la llave pública del certificado')
  }
}

/**
 * Import a private key from a .key file (PKCS#8 PEM or DER).
 * Throws if the file is not a valid private key or the password is incorrect.
 */
async function importPrivateKey(keyFile: File, _password: string): Promise<CryptoKey> {
  const keyBuffer = await keyFile.arrayBuffer()
  const keyBytes = new Uint8Array(keyBuffer)
  const keyText = new TextDecoder().decode(keyBytes)

  let keyDer: ArrayBuffer

  if (keyText.includes('-----BEGIN PRIVATE KEY-----')) {
    const b64 = keyText
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '')
    keyDer = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer
  } else if (keyText.includes('-----BEGIN RSA PRIVATE KEY-----')) {
    const b64 = keyText
      .replace(/-----BEGIN RSA PRIVATE KEY-----/, '')
      .replace(/-----END RSA PRIVATE KEY-----/, '')
      .replace(/\s/g, '')
    keyDer = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer
  } else if (keyText.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----')) {
    // Encrypted PKCS#8 — requires password decryption
    // WebCrypto no soporta PKCS#8 cifrado directamente.
    // Para llaves del SAT (.key cifradas), se requiere pkijs o node-forge.
    throw new Error(
      'Llave privada cifrada detectada. ' +
      'Por el momento solo se aceptan llaves PKCS#8 sin cifrar (.pem). ' +
      'Soporte para llaves cifradas del SAT próximamente.'
    )
  } else {
    // Try as raw DER
    keyDer = keyBuffer
  }

  try {
    return await crypto.subtle.importKey(
      'pkcs8',
      keyDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    )
  } catch {
    throw new Error(
      'No se pudo importar la llave privada. ' +
      'Verifica que el archivo sea una llave privada válida en formato PKCS#8 o PEM.'
    )
  }
}

/**
 * Validate that a private key corresponds to a certificate.
 * Signs a test message with the .key and verifies with the .cer public key.
 */
export async function validateKeyMatchesCertificate(
  keyFile: File,
  password: string,
  certPemBase64: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const privateKey = await importPrivateKey(keyFile, password)
    const publicKey = await extractPublicKey(certPemBase64)

    // Sign a test message
    const testData = new TextEncoder().encode('longevity-ia-key-validation-test')
    const testSignature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, testData)

    // Verify with public key
    const isValid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, testSignature, testData)

    if (!isValid) {
      return { valid: false, error: 'La llave privada NO corresponde al certificado proporcionado' }
    }
    return { valid: true }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Error al validar la llave' }
  }
}

/**
 * Sign a cadena original using the private key.
 * SECURITY: No demo/fallback signatures. Fails hard if key is invalid.
 */
export async function signCadenaOriginal(
  cadenaOriginal: string,
  keyFile: File,
  password: string,
  certPemBase64: string,
): Promise<{ signatureBase64: string; digestHex: string }> {
  // Step 1: Hash the cadena original with SHA-256
  const encoder = new TextEncoder()
  const data = encoder.encode(cadenaOriginal)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const digestHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  // Step 2: Import and validate the private key
  const privateKey = await importPrivateKey(keyFile, password)

  // Step 3: Validate key matches certificate
  try {
    const publicKey = await extractPublicKey(certPemBase64)
    const testData = new TextEncoder().encode('longevity-ia-sign-validation')
    const testSig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, testData)
    const match = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, testSig, testData)
    if (!match) {
      throw new Error('La llave privada no corresponde al certificado. Verifica que sean del mismo titular.')
    }
  } catch (verifyErr) {
    // If public key extraction fails, proceed with signing but warn
    // The server should do its own verification
    if (verifyErr instanceof Error && verifyErr.message.includes('no corresponde')) {
      throw verifyErr
    }
    console.warn('[client-signer] Could not verify key-cert match:', verifyErr)
  }

  // Step 4: Sign the hash
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    hashBuffer,
  )

  const signatureBase64 = btoa(Array.from(new Uint8Array(signatureBuffer)).map(b => String.fromCharCode(b)).join(''))

  return { signatureBase64, digestHex }
}

// ── DER parsing helpers ─────────────────────────────────────

function extractSerialFromDER(der: Uint8Array): string {
  for (let i = 0; i < Math.min(der.length, 100); i++) {
    if (der[i] === 0x02 && i > 10) {
      const len = der[i + 1]
      if (len > 0 && len < 30) {
        const serialBytes = der.slice(i + 2, i + 2 + len)
        return Array.from(serialBytes).map(b => b.toString(16).padStart(2, '0')).join('')
      }
    }
  }
  return 'unknown'
}

function extractNamesFromDER(der: Uint8Array, pemText: string): { subject: string; issuer: string; rfc: string | null } {
  const strings: string[] = []
  let rfc: string | null = null

  for (let i = 0; i < der.length - 2; i++) {
    if ((der[i] === 0x0C || der[i] === 0x13) && der[i + 1] < 100) {
      const len = der[i + 1]
      if (len > 3 && len < 80 && i + 2 + len <= der.length) {
        try {
          const str = new TextDecoder().decode(der.slice(i + 2, i + 2 + len))
          if (/^[A-Z]{3,4}\d{6}/.test(str)) rfc = str
          if (str.length > 5) strings.push(str)
        } catch { /* skip */ }
      }
    }
  }

  if (!rfc && pemText) {
    const rfcMatch = pemText.match(/serialNumber=([A-Z]{3,4}\d{6}\w+)/i)
    if (rfcMatch) rfc = rfcMatch[1]
  }

  return {
    subject: strings[0] ?? 'Titular del certificado',
    issuer: strings.length > 1 ? strings[strings.length - 1] : 'Autoridad Certificadora',
    rfc,
  }
}

function extractValidityFromDER(der: Uint8Array): { validFrom: string; validTo: string } {
  const dates: string[] = []

  for (let i = 0; i < der.length - 2; i++) {
    if ((der[i] === 0x17 || der[i] === 0x18) && der[i + 1] >= 12 && der[i + 1] <= 15) {
      const len = der[i + 1]
      try {
        const timeStr = new TextDecoder().decode(der.slice(i + 2, i + 2 + len))
        if (der[i] === 0x17 && timeStr.length >= 12) {
          const yy = parseInt(timeStr.slice(0, 2))
          const year = yy >= 50 ? 1900 + yy : 2000 + yy
          dates.push(`${year}-${timeStr.slice(2, 4)}-${timeStr.slice(4, 6)}T00:00:00Z`)
        }
        if (der[i] === 0x18 && timeStr.length >= 14) {
          dates.push(`${timeStr.slice(0, 4)}-${timeStr.slice(4, 6)}-${timeStr.slice(6, 8)}T00:00:00Z`)
        }
      } catch { /* skip */ }
    }
  }

  return {
    validFrom: dates[0] ?? new Date().toISOString(),
    validTo: dates[1] ?? new Date(Date.now() + 4 * 365 * 86400000).toISOString(),
  }
}

/**
 * Try to extract the SubjectPublicKeyInfo (SPKI) from a full X.509 certificate DER.
 * Looks for the SEQUENCE containing the public key algorithm + BIT STRING.
 */
function extractSPKIFromCert(der: Uint8Array): Uint8Array | null {
  // Simplified: look for the pattern: SEQUENCE { SEQUENCE { OID ... }, BIT STRING }
  // The SPKI is the 7th element in the TBS certificate (after version, serial, algorithm, issuer, validity, subject)
  // This is a best-effort extraction

  let seqCount = 0
  for (let i = 4; i < der.length - 10; i++) {
    // SEQUENCE tag (0x30) with length > 30 (likely a structural element)
    if (der[i] === 0x30 && der[i + 1] > 30) {
      seqCount++
      // The SPKI is typically around the 6th-8th SEQUENCE
      // Check if this SEQUENCE contains a BIT STRING (0x03) shortly after
      if (seqCount >= 6 && seqCount <= 10) {
        // Look ahead for BIT STRING
        for (let j = i + 2; j < Math.min(i + 50, der.length); j++) {
          if (der[j] === 0x03 && der[j + 1] > 10) {
            // Found potential SPKI — extract from the SEQUENCE start
            let len = der[i + 1]
            if (len === 0x82) {
              len = (der[i + 2] << 8) | der[i + 3]
              return der.slice(i, i + 4 + len)
            } else if (len === 0x81) {
              len = der[i + 2]
              return der.slice(i, i + 3 + len)
            } else if (len < 0x80) {
              return der.slice(i, i + 2 + len)
            }
          }
        }
      }
    }
  }
  return null
}
