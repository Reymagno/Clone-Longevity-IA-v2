/**
 * LONGEVITY IA — Edad Biológica Determinista v2.0
 *
 * Basado en PhenoAge (Levine, Aging 2018) simplificado para biomarcadores
 * de laboratorio estándar, calibrado con NHANES III (>13,000 participantes).
 *
 * + Modificadores adicionales de longevidad basados en:
 * - Shamliyan, Annals of Internal Medicine 2012 (RDW, albumina)
 * - Fulop, Nature Reviews Immunology 2018 (inflammaging)
 * - Khaw, Annals of Internal Medicine 2004 (HbA1c)
 *
 * Derechos reservados - Longevity Clinic SA de CV
 */

import type { ParsedBiomarkers } from './longevity-scoring'

export interface PhenoAgeResult {
  biologicalAge: number          // Edad biológica calculada
  chronologicalAge: number       // Edad cronológica del paciente
  ageDelta: number               // biologicalAge - chronologicalAge (negativo = más joven)
  phenoAgeRaw: number            // PhenoAge antes de modificadores
  modifiers: PhenoAgeModifier[]  // Ajustes aplicados
  interpretation: string         // Texto descriptivo
}

export interface PhenoAgeModifier {
  name: string
  value: number          // Valor del biomarcador
  adjustment: number     // Años sumados o restados
  reason: string
  evidence: string
}

/**
 * Calcula PhenoAge simplificado basado en Levine 2018.
 *
 * Fórmula original usa 9 biomarcadores + edad cronológica:
 * albumina, creatinina, glucosa, ln(PCR), % linfocitos, VCM, RDW,
 * fosfatasa alcalina, leucocitos
 *
 * Si faltan biomarcadores, usa el subconjunto disponible con ajuste.
 */
export function computePhenoAge(
  parsed: ParsedBiomarkers,
  chronologicalAge: number,
  gender: string = 'male'
): PhenoAgeResult {
  // Extraer valores
  const albumin = getVal(parsed, 'liver', 'albumin')
  const creatinine = getVal(parsed, 'metabolic', 'creatinine')
  const glucose = getVal(parsed, 'metabolic', 'glucose')
  const crp = getVal(parsed, 'inflammation', 'crp')
  const lymphocytes = getVal(parsed, 'hematology', 'lymphocytes')
  const mcv = getVal(parsed, 'hematology', 'mcv')
  const rdw = getVal(parsed, 'hematology', 'rdw')
  const alkPhos = getVal(parsed, 'liver', 'alkalinePhosphatase')
  const wbc = getVal(parsed, 'hematology', 'wbc')

  // Convertir unidades para la fórmula PhenoAge (usa unidades SI)
  const albuminGperL = albumin !== null ? albumin * 10 : null      // g/dL → g/L
  const creatUmol = creatinine !== null ? creatinine * 88.4 : null // mg/dL → µmol/L
  const glucMmol = glucose !== null ? glucose / 18.016 : null      // mg/dL → mmol/L
  const lnCrp = crp !== null && crp > 0 ? Math.log(crp) : null    // ln(mg/L)

  // Contar biomarcadores disponibles para PhenoAge
  const available = [albuminGperL, creatUmol, glucMmol, lnCrp, lymphocytes, mcv, rdw, alkPhos, wbc]
  const availableCount = available.filter(v => v !== null).length

  let phenoAgeRaw: number

  if (availableCount >= 5) {
    // Fórmula PhenoAge — coeficientes de Levine 2018
    // xb = intercept + sum(βi × xi) + β_age × age
    let xb = -19.9067

    if (albuminGperL !== null) xb += -0.0336 * albuminGperL
    if (creatUmol !== null)    xb += 0.0095 * creatUmol
    if (glucMmol !== null)     xb += 0.1953 * glucMmol
    if (lnCrp !== null)        xb += 0.0954 * lnCrp
    if (lymphocytes !== null)  xb += -0.0120 * lymphocytes
    if (mcv !== null)          xb += 0.0268 * mcv
    if (rdw !== null)          xb += 0.3306 * rdw
    if (alkPhos !== null)      xb += 0.00188 * alkPhos
    if (wbc !== null)          xb += 0.0554 * wbc
    xb += 0.0804 * chronologicalAge

    // Ajustar por biomarcadores faltantes (escalar proporcionalmente)
    const scaleFactor = 9 / availableCount
    const xbAdj = -19.9067 + (xb - (-19.9067)) * (1 / scaleFactor) // normalize

    // Mortalidad score
    const mortalityScore = 1 - Math.exp(
      -Math.exp(xbAdj) * (Math.exp(120 * 0.0077) - 1) / 0.0077
    )

    // PhenoAge
    phenoAgeRaw = 141.50225 + Math.log(-0.00553 * Math.log(1 - mortalityScore)) / 0.09165

    // Sanity check
    if (!isFinite(phenoAgeRaw) || phenoAgeRaw < 10 || phenoAgeRaw > 150) {
      phenoAgeRaw = chronologicalAge // fallback
    }
  } else {
    // No hay suficientes biomarcadores para PhenoAge — usar método de score
    phenoAgeRaw = chronologicalAge // se ajustará con modificadores
  }

  // ── Modificadores adicionales basados en evidencia ─────────────
  const modifiers: PhenoAgeModifier[] = []

  // RDW — Patel, Arch Intern Med 2009
  if (rdw !== null) {
    if (rdw > 15) {
      modifiers.push({ name: 'RDW elevado', value: rdw, adjustment: +2.0, reason: 'RDW >15% asociado a mortalidad significativamente aumentada', evidence: 'Patel, Arch Intern Med 2009' })
    } else if (rdw > 14) {
      modifiers.push({ name: 'RDW moderadamente elevado', value: rdw, adjustment: +1.0, reason: 'RDW >14% predictor independiente de mortalidad', evidence: 'Patel, Arch Intern Med 2009' })
    } else if (rdw < 12.5) {
      modifiers.push({ name: 'RDW óptimo', value: rdw, adjustment: -0.5, reason: 'Variabilidad eritrocitaria mínima', evidence: 'Patel, Arch Intern Med 2009' })
    }
  }

  // Albumina — Phillips, Lancet 1989
  if (albumin !== null) {
    if (albumin < 3.5) {
      modifiers.push({ name: 'Albumina baja', value: albumin, adjustment: +3.0, reason: 'Albumina <3.5 = +4x mortalidad', evidence: 'Phillips, Lancet 1989' })
    } else if (albumin < 4.0) {
      modifiers.push({ name: 'Albumina subóptima', value: albumin, adjustment: +1.5, reason: 'Albumina <4.0 asociada a riesgo aumentado', evidence: 'Phillips, Lancet 1989' })
    } else if (albumin >= 4.8) {
      modifiers.push({ name: 'Albumina óptima', value: albumin, adjustment: -1.0, reason: 'Estado nutricional y función hepática excelentes', evidence: 'Phillips, Lancet 1989' })
    }
  }

  // PCR — Ridker, NEJM 2017
  if (crp !== null) {
    if (crp > 5.0) {
      modifiers.push({ name: 'PCR muy elevada', value: crp, adjustment: +3.0, reason: 'Inflammaging severo, riesgo CV multiplicado', evidence: 'Ridker, NEJM 2017 (CANTOS)' })
    } else if (crp > 3.0) {
      modifiers.push({ name: 'PCR elevada', value: crp, adjustment: +2.0, reason: 'Inflamación crónica activa', evidence: 'Ridker, NEJM 2017' })
    } else if (crp < 0.3) {
      modifiers.push({ name: 'PCR óptima', value: crp, adjustment: -1.0, reason: 'Inflammaging mínimo', evidence: 'Ridker, NEJM 2017' })
    }
  }

  // HbA1c — Khaw, Annals of Internal Medicine 2004
  const hba1c = getVal(parsed, 'hormones', 'hba1c')
  if (hba1c !== null) {
    if (hba1c > 7.0) {
      modifiers.push({ name: 'HbA1c muy elevada', value: hba1c, adjustment: +3.0, reason: 'Diabetes mal controlada, glicación proteica acelerada', evidence: 'Khaw, Ann Intern Med 2004' })
    } else if (hba1c > 6.0) {
      modifiers.push({ name: 'HbA1c elevada', value: hba1c, adjustment: +1.5, reason: 'Pre-diabetes, estrés glucémico crónico', evidence: 'Khaw, Ann Intern Med 2004' })
    } else if (hba1c < 5.2) {
      modifiers.push({ name: 'HbA1c óptima', value: hba1c, adjustment: -1.0, reason: 'Control glucémico excelente para longevidad', evidence: 'Khaw, Ann Intern Med 2004' })
    }
  }

  // Vitamina D — Melamed, Arch Intern Med 2008
  const vitD = getVal(parsed, 'vitamins', 'vitaminD')
  if (vitD !== null) {
    if (vitD > 60) {
      modifiers.push({ name: 'Vitamina D óptima', value: vitD, adjustment: -1.0, reason: 'Nivel de longevidad alcanzado', evidence: 'Melamed, Arch Intern Med 2008' })
    } else if (vitD < 20) {
      modifiers.push({ name: 'Vitamina D deficiente', value: vitD, adjustment: +2.0, reason: 'Deficiencia severa: riesgo óseo, inmune y CV', evidence: 'Melamed, Arch Intern Med 2008' })
    }
  }

  // GFR — Go, NEJM 2004
  const gfr = getVal(parsed, 'metabolic', 'gfr')
  if (gfr !== null) {
    if (gfr > 90) {
      modifiers.push({ name: 'GFR óptima', value: gfr, adjustment: -0.5, reason: 'Función renal preservada', evidence: 'Go, NEJM 2004' })
    } else if (gfr < 45) {
      modifiers.push({ name: 'GFR severamente reducida', value: gfr, adjustment: +3.0, reason: 'Enfermedad renal estadio 3b+', evidence: 'Go, NEJM 2004' })
    } else if (gfr < 60) {
      modifiers.push({ name: 'GFR reducida', value: gfr, adjustment: +1.5, reason: 'ERC estadio 3a, riesgo CV aumentado', evidence: 'Go, NEJM 2004' })
    }
  }

  // Ferritina — Kell, BMC Medical Genomics 2009
  const ferritin = getVal(parsed, 'vitamins', 'ferritin')
  if (ferritin !== null) {
    const highThreshold = gender === 'female' ? 150 : 200
    if (ferritin > highThreshold) {
      modifiers.push({ name: 'Ferritina elevada', value: ferritin, adjustment: +1.0, reason: 'Sobrecarga de hierro pro-inflamatoria', evidence: 'Kell, BMC Medical Genomics 2009' })
    }
  }

  // Calcular edad biológica final
  const totalModifierAdjustment = modifiers.reduce((sum, m) => sum + m.adjustment, 0)
  let biologicalAge = Math.round(phenoAgeRaw + totalModifierAdjustment)

  // Límites
  biologicalAge = Math.max(18, Math.min(chronologicalAge + 15, biologicalAge))

  const ageDelta = biologicalAge - chronologicalAge

  // Interpretación
  let interpretation: string
  if (ageDelta <= -5) {
    interpretation = `Tu cuerpo funciona como el de alguien ${Math.abs(ageDelta)} años más joven. Tus biomarcadores reflejan un envejecimiento significativamente más lento que el promedio.`
  } else if (ageDelta <= -2) {
    interpretation = `Tu cuerpo muestra ${Math.abs(ageDelta)} años de ventaja biológica. Tu perfil de biomarcadores es favorable para la longevidad.`
  } else if (ageDelta <= 2) {
    interpretation = `Tu edad biológica es consistente con tu edad cronológica. Tu cuerpo envejece al ritmo esperado.`
  } else if (ageDelta <= 5) {
    interpretation = `Tu cuerpo muestra ${ageDelta} años de desgaste adicional. Hay biomarcadores que indican envejecimiento acelerado y requieren intervención.`
  } else {
    interpretation = `Tu cuerpo presenta ${ageDelta} años de envejecimiento acelerado significativo. Se requiere intervención urgente en los sistemas más comprometidos.`
  }

  return {
    biologicalAge,
    chronologicalAge,
    ageDelta,
    phenoAgeRaw: Math.round(phenoAgeRaw * 10) / 10,
    modifiers,
    interpretation,
  }
}

// ── Helper ───────────────────────────────────────────────────────

function getVal(parsed: ParsedBiomarkers, section: string, key: string): number | null {
  const sec = parsed[section as keyof ParsedBiomarkers]
  if (!sec) return null
  const bm = sec[key]
  if (!bm || bm.value === null || bm.value === undefined) return null
  return bm.value
}
