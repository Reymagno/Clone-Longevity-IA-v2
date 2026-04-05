/**
 * LONGEVITY IA — Generador de CDA (Clinical Document Architecture) R2
 *
 * Genera un documento XML conforme al estándar HL7 CDA R2 para prescripciones médicas.
 * Este es el documento canónico que se firma con XMLDSig.
 * El PDF se genera como vista visual de este CDA.
 *
 * Referencia: HL7 CDA R2, NOM-024-SSA3-2012
 */

import type { Patient } from '@/types'
import type { PrescriptionItem, CustomItem, MedicoInfo } from '@/lib/prescription-pdf'

export interface CDAMetadata {
  documentId: string          // UUID único del documento
  verificationCode: string    // Código corto para verificación (RX-XXXXXX)
  createdAt: string          // ISO 8601
  languageCode: string       // es-MX
}

export interface CDASignatureInfo {
  signedAt: string
  certificateSerial: string
  certificateSubject: string
  certificateIssuer: string
  certificateValidFrom: string
  certificateValidTo: string
  signatureValue: string      // Base64
  digestValue: string         // SHA-256 hash
  rfc?: string
}

/**
 * Generate the canonical chain (cadena original) for the CDA.
 * This is the string that gets hashed and signed.
 */
export function buildCadenaOriginal(
  metadata: CDAMetadata,
  medico: MedicoInfo,
  patient: Pick<Patient, 'name' | 'age' | 'gender'>,
  items: Array<{ molecule: string; dose: string; classification: string }>,
): string {
  const parts = [
    '',  // leading separator
    '1.0',  // version
    metadata.documentId,
    metadata.verificationCode,
    metadata.createdAt,
    medico.fullName,
    medico.licenseNumber,
    medico.specialty,
    medico.email,
    patient.name,
    String(patient.age),
    patient.gender,
    ...items.map(it => `${it.molecule}|${it.dose}|${it.classification}`),
    '',  // trailing separator
  ]
  return parts.join('||')
}

/**
 * Generate a short verification code for the prescription.
 */
export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  // no confusing chars (0/O, 1/I)
  let code = 'RX-'
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * Generate HL7 CDA R2 XML document for a prescription.
 */
export function generatePrescriptionCDA(
  metadata: CDAMetadata,
  medico: MedicoInfo,
  patient: Patient,
  items: PrescriptionItem[],
  customItems: CustomItem[],
  notes: string,
  signature?: CDASignatureInfo,
): string {
  const allItems = [
    ...items.map(it => ({
      molecule: it.molecule,
      dose: it.dose,
      classification: it.classification,
      instructions: it.instructions ?? '',
      requiresSupervision: it.requiresSupervision,
      status: it.status,
      category: it.category,
      mechanism: it.mechanism ?? '',
    })),
    ...customItems.map(it => ({
      molecule: it.molecule,
      dose: it.dose,
      classification: it.classification,
      instructions: it.instructions,
      requiresSupervision: it.requiresSupervision,
      status: 'custom' as const,
      category: '',
      mechanism: '',
    })),
  ]

  // Escape XML special characters
  function esc(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  const genderCode = patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : 'UN'
  const bmi = patient.weight && patient.height
    ? (patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1)
    : null

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="urn:hl7-org:v3 CDA.xsd">

  <!-- ═══ HEADER ═══ -->
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
  <templateId root="2.16.840.1.113883.10.20.22.1.1"/>
  <id root="${esc(metadata.documentId)}"/>
  <code code="57833-6" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC"
    displayName="Prescription for medication"/>
  <title>Prescripción Médica Digital — Longevity IA</title>
  <effectiveTime value="${metadata.createdAt.replace(/[-:T]/g, '').slice(0, 14)}"/>
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
  <languageCode code="${metadata.languageCode}"/>

  <!-- Código de verificación -->
  <setId root="${esc(metadata.verificationCode)}"/>
  <versionNumber value="1"/>

  <!-- ═══ PATIENT ═══ -->
  <recordTarget>
    <patientRole>
      <id extension="${esc(patient.code)}" root="2.16.840.1.113883.4.1"/>
      <patient>
        <name><given>${esc(patient.name)}</given></name>
        <administrativeGenderCode code="${genderCode}" codeSystem="2.16.840.1.113883.5.1"/>
        <birthTime value=""/>
      </patient>
    </patientRole>
  </recordTarget>

  <!-- ═══ AUTHOR (MEDICO) ═══ -->
  <author>
    <time value="${metadata.createdAt.replace(/[-:T]/g, '').slice(0, 14)}"/>
    <assignedAuthor>
      <id extension="${esc(medico.licenseNumber)}" root="2.16.840.1.113883.4.2"/>
      <assignedPerson>
        <name><given>${esc(medico.fullName)}</given></name>
      </assignedPerson>
      <representedOrganization>
        <name>Longevity IA</name>
        <telecom value="mailto:${esc(medico.email)}"/>
      </representedOrganization>
    </assignedAuthor>
  </author>

  <!-- ═══ CUSTODIAN ═══ -->
  <custodian>
    <assignedCustodian>
      <representedCustodianOrganization>
        <id root="2.16.840.1.113883.19"/>
        <name>Longevity IA - Medicina Regenerativa y Longevidad</name>
      </representedCustodianOrganization>
    </assignedCustodian>
  </custodian>

  <!-- ═══ PATIENT DATA ═══ -->
  <component>
    <structuredBody>

      <!-- Sección: Datos del paciente -->
      <component>
        <section>
          <code code="10164-2" codeSystem="2.16.840.1.113883.6.1" displayName="Patient demographics"/>
          <title>Datos del Paciente</title>
          <text>
            <table>
              <tbody>
                <tr><td>Nombre</td><td>${esc(patient.name)}</td></tr>
                <tr><td>Código</td><td>${esc(patient.code)}</td></tr>
                <tr><td>Edad</td><td>${patient.age} años</td></tr>
                <tr><td>Género</td><td>${genderCode === 'M' ? 'Masculino' : genderCode === 'F' ? 'Femenino' : 'Otro'}</td></tr>
                ${patient.weight ? `<tr><td>Peso</td><td>${patient.weight} kg</td></tr>` : ''}
                ${patient.height ? `<tr><td>Estatura</td><td>${patient.height} cm</td></tr>` : ''}
                ${bmi ? `<tr><td>IMC</td><td>${bmi} kg/m²</td></tr>` : ''}
              </tbody>
            </table>
          </text>
        </section>
      </component>

      <!-- Sección: Prescripción -->
      <component>
        <section>
          <code code="57828-6" codeSystem="2.16.840.1.113883.6.1" displayName="Prescriptions"/>
          <title>Prescripción Médica</title>
          <text>
            <table>
              <thead>
                <tr><th>Medicamento</th><th>Dosis</th><th>Clasificación</th><th>Instrucciones</th><th>Supervisión</th></tr>
              </thead>
              <tbody>
${allItems.map(it => `                <tr>
                  <td>${esc(it.molecule)}</td>
                  <td>${esc(it.dose)}</td>
                  <td>${esc(it.classification.toUpperCase())}</td>
                  <td>${esc(it.instructions)}</td>
                  <td>${it.requiresSupervision ? 'Sí' : 'No'}</td>
                </tr>`).join('\n')}
              </tbody>
            </table>
          </text>
${allItems.map((it, idx) => `
          <!-- Entrada estructurada: ${esc(it.molecule)} -->
          <entry>
            <substanceAdministration classCode="SBADM" moodCode="RQO">
              <id root="${metadata.documentId}-${idx + 1}"/>
              <statusCode code="active"/>
              <consumable>
                <manufacturedProduct>
                  <manufacturedMaterial>
                    <code displayName="${esc(it.molecule)}"/>
                    <name>${esc(it.molecule)}</name>
                  </manufacturedMaterial>
                </manufacturedProduct>
              </consumable>
              <doseQuantity value="${esc(it.dose)}"/>
              <entryRelationship typeCode="SUBJ">
                <act classCode="ACT" moodCode="INT">
                  <code displayName="classification" />
                  <text>${esc(it.classification)}</text>
                </act>
              </entryRelationship>
            </substanceAdministration>
          </entry>`).join('\n')}
        </section>
      </component>

      ${notes ? `
      <!-- Sección: Notas clínicas -->
      <component>
        <section>
          <code code="48767-8" codeSystem="2.16.840.1.113883.6.1" displayName="Annotation comment"/>
          <title>Notas del Médico</title>
          <text><paragraph>${esc(notes)}</paragraph></text>
        </section>
      </component>` : ''}

    </structuredBody>
  </component>
`

  // Signature block (if signed)
  if (signature) {
    xml += `
  <!-- ═══ FIRMA ELECTRÓNICA AVANZADA ═══ -->
  <legalAuthenticator>
    <time value="${signature.signedAt.replace(/[-:T]/g, '').slice(0, 14)}"/>
    <signatureCode code="S"/>
    <assignedEntity>
      <id extension="${esc(medico.licenseNumber)}" root="2.16.840.1.113883.4.2"/>
      <assignedPerson>
        <name><given>${esc(signature.certificateSubject)}</given></name>
      </assignedPerson>
    </assignedEntity>
  </legalAuthenticator>

  <!-- Verificacion: ${esc(metadata.verificationCode)} -->
`
  }

  xml += `</ClinicalDocument>`

  return xml
}

/**
 * Compute SHA-256 hash of a string (for the cadena original).
 * Works in both Node.js and browser environments.
 */
export async function hashSHA256(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // Browser / Edge Runtime
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
  // Node.js fallback
  const { createHash } = await import('crypto')
  return createHash('sha256').update(text).digest('hex')
}
