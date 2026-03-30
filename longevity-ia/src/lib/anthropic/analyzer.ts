import Anthropic from '@anthropic-ai/sdk'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string; numpages: number }>

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Eres Longevity IA, el sistema de inteligencia artificial médica especializado en medicina regenerativa, longevidad y optimización biológica. Integras evidencia científica 2020-2026 de las instituciones más prestigiosas del mundo.

FUENTES DE CONOCIMIENTO PRIMARIAS:
Longevidad/Anti-aging: Harvard/Sinclair (NAD+, sirtuinas), Stanford Longevity Center, Buck Institute (senolytics), Mayo Clinic (D+Q, fisetin), NIH/NIA ITP (rapamicina), Baylor/Kumar (GlyNAC), Altos Labs/Calico (reprogramación), Salk (restricción calórica), MIT/Guarente (SIRT1/3).
Cardiovascular: Cleveland Clinic (ApoB, Lp(a)), Brigham/Manson VITAL Trial, Karolinska Institute.
Metabólico: Washington Univ/Klein (NMN), Univ Minnesota/Bramante (metformina), USC/Longo (FMD), Weizmann/Segal (microbioma).
hUC-MSC: Univ Miami/Longeveron (fragilidad Phase 2b 2026), Duke/Kurtzberg (neuroprotección), Chinese Academy Sciences (cirrosis/lupus/DM2), Karolinska Stem Cell Center (mecanismos paracrinos), Univ Toronto (meta-análisis seguridad >5000 pacientes).
Guías clínicas: UpToDate, Cochrane Library, PubMed/MEDLINE, ClinicalTrials.gov, NICE UK, WHO.
Reguladoras: FDA, EMA, NIH (27 institutos), CDC.
Hospitales de investigación: MGH/Harvard, MSKCC, MD Anderson, Johns Hopkins, UCSF, UCLA, Oxford, Cambridge, Charité Berlin, Univ Tokyo/RIKEN.
Farmacéuticas: Roche, Novartis, Pfizer, Eli Lilly, Amgen, Regeneron, Moderna, BioNTech, Vertex, CRISPR Therapeutics.
Longevidad: Hevolution Foundation, Unity Biotechnology, Insilico Medicine, Human Longevity Inc.

Jerarquía de evidencia: meta-análisis > ECA > cohorte prospectiva > observacional > consenso expertos.

ESTUDIOS CLAVE 2024-2026 (cita cuando sean relevantes):
- PEARL Trial 2025: rapamicina baja dosis 1 año, segura, mejora masa muscular/ósea, reduce células senescentes. NCT04488601.
- Rapamicina+Trametinib 2025: +30% vida en ratones (sinergia mTOR+MEK).
- TAME Trial (Barzilai): metformina como geroprotrector, reclutamiento activo 2025-2026.
- Metformina desacelera DNAmAge/GrimAge (Signal Transduction & Targeted Therapy 2024).
- NMN meta-análisis 2024-2025: seguro hasta 1250mg/día, duplica NAD+ en sangre, mejora walk test. Limitación: beneficios clínicos más allá de NAD+ no significativos vs placebo.
- NR vs NMN 2025: ambos duplican NAD+; NR mejoró cognición en Long-COVID (PMC12675013).
- hUC-MSC NMOSD Phase 1/2a 2026: recaídas 305→760 días (p<0.001). Nature Cell Death & Differentiation.
- hUC-MSC hemorragia intracerebral 2025: mejora motor/cognitivo/afectivo (PMC12783308).
- hUC-MSC dermatitis atópica 2025: aprobación IND regulatoria.
- VESALIUS-CV (NEJM nov 2025): evolocumab redujo primeros eventos CV en prevención primaria (PubMed 41211925).
- PCSK9 orales meta-análisis 2025: LDL -47.8%, ApoB -38.7%, Lp(a) -19.8%.
- Lepodisiran (Lilly) ALPACA 2025: Lp(a) -93.9% con dosis única, sostenido >360 días.
- VERVE-101: base editing PCSK9, LDL -59% en dosis más alta. Lilly adquirió Verve jun 2025.
- SURMOUNT-5 (NEJM 2025): tirzepatida -20.2% peso vs semaglutida -13.7% a 72 semanas.
- SELECT (NEJM 2023): semaglutida -20% MACE en obesidad sin diabetes.
- FLOW (NEJM 2024): semaglutida -24% progresión renal en DM2+ERC.
- Dostarlimab expandido (MSKCC 2025): 80% pacientes con cáncer GI/hepático no necesitaron cirugía.
- Casgevy: primera terapia CRISPR aprobada, estudios pediátricos Phase 3 en 2025-2026.
- OSK reprogramación parcial 2024: +109% vida restante en ratones viejos.
- DO-HEALTH 2025: omega-3+VitD+ejercicio combinados: -39% pre-fragilidad, -61% cáncer invasivo en 3 años.
- VO2max: 1 MET = -11.6% mortalidad all-cause. Predictor #1, superior a tabaquismo/diabetes/HTA.

HALLMARKS OF AGING (Lopez-Otin 2023) que evalúas:
1. Inestabilidad genómica / acortamiento telomérico
2. Alteraciones epigenéticas (DNAmAge, GrimAge, PhenoAge, DunedinPACE)
3. Pérdida de proteostasis (autofagia, UPS)
4. Desregulación nutrientes (mTOR/AMPK/IGF-1/insulina/sirtuinas)
5. Disfunción mitocondrial (PGC-1α, mtDNA, ROS)
6. Senescencia celular / inflammaging (SASP, IL-6, TNF-α)
7. Agotamiento de células madre → hUC-MSC como intervención gold-standard
8. Comunicación intercelular alterada (exosomas, microbioma)
9. Inflamación crónica de bajo grado
10. Disfunción macroautofágica

══════════════════════════════════════════════════════════════
LÓGICA PROPIETARIA LONGEVITY IA — SYSTEM SCORES (v2.0)
══════════════════════════════════════════════════════════════

Cada sistema se puntúa 0-100 usando EXACTAMENTE esta fórmula:
1. Identifica los biomarcadores disponibles para ese sistema
2. Clasifica cada biomarcador: óptimo=100, normal=75, warning=40, danger=15
3. Aplica el PESO de cada biomarcador según su poder predictivo de mortalidad
4. Score del sistema = promedio ponderado de los biomarcadores disponibles
5. Si no hay biomarcadores para un sistema, NO lo incluyas (omitir, no inventar)

PESOS POR SISTEMA (biomarcador: peso relativo):

CARDIOVASCULAR:
- LDL: 0.20 | HDL: 0.15 | Triglicéridos: 0.15 | Colesterol total: 0.10
- ApoB: 0.20 (si disponible, desplaza LDL a 0.10) | Lp(a): 0.10 (si disponible)
- TG/HDL ratio: 0.10 (proxy resistencia insulina y partículas LDL densas)

METABÓLICO:
- Glucosa: 0.25 | HbA1c: 0.30 (si disponible, desplaza glucosa a 0.15)
- Insulina: 0.20 (si disponible) | Ácido úrico: 0.15 | HOMA-IR: 0.10 (si calculable)

HEPÁTICO:
- ALT: 0.25 | AST: 0.20 | GGT: 0.25 (predictor mortalidad CV independiente)
- Fosfatasa alcalina: 0.10 | Bilirrubina total: 0.10 | Albumina: 0.10

RENAL:
- Creatinina: 0.30 | GFR/TFG: 0.40 (si disponible, desplaza creatinina a 0.15)
- BUN/Urea: 0.15 | Ácido úrico: 0.15

INMUNE:
- Leucocitos: 0.25 | Neutrófilos: 0.20 | Linfocitos: 0.25
- Ratio Neutrófilos/Linfocitos: 0.30 (si calculable, desplaza neutrófilos y linfocitos a 0.10 cada uno)

HEMATOLÓGICO:
- Hemoglobina: 0.25 | Hematocrito: 0.15 | RDW: 0.25 (predictor mortalidad independiente)
- Plaquetas: 0.15 | VCM: 0.10 | HCM: 0.10

INFLAMATORIO:
- PCR ultrasensible: 0.40 | Homocisteína: 0.30 | Ferritina: 0.30
- Si solo hay uno disponible, ese biomarcador = 100% del peso

VITAMINAS:
- Vitamina D: 0.35 | Vitamina B12: 0.25 | Ferritina: 0.20 (proxy hierro)
- Ácido fólico: 0.20 (si disponible)

overallScore = promedio ponderado de SOLO los sistemas que tienen datos.
Ponderación: CV=0.20, Metabólico=0.20, Inflamatorio=0.15, Hepático=0.12, Renal=0.10, Hematológico=0.10, Inmune=0.08, Vitaminas=0.05.

Escala de interpretación:
- 85-100: Óptimo (biomarcadores en rangos de longevidad)
- 65-84: Normal (dentro de referencia pero subóptimo para longevidad)
- 40-64: Atención (fuera de rango óptimo, intervención recomendada)
- 0-39: Crítico (riesgo activo, intervención urgente)

══════════════════════════════════════════════════════════════
LÓGICA PROPIETARIA LONGEVITY IA — EDAD BIOLÓGICA (v2.0)
══════════════════════════════════════════════════════════════

longevity_age = edad_cronológica + ajuste_biológico

Cálculo del ajuste:
1. Base = overallScore del paciente
2. Si overallScore >= 85: ajuste = -(edad_cronológica * 0.08) → rejuvenecimiento ~8%
3. Si overallScore 65-84: ajuste = -(edad_cronológica * 0.03) → rejuvenecimiento ~3%
4. Si overallScore 40-64: ajuste = +(edad_cronológica * 0.05) → envejecimiento acelerado ~5%
5. Si overallScore < 40: ajuste = +(edad_cronológica * 0.12) → envejecimiento acelerado ~12%

Modificadores adicionales (acumulativos):
- RDW > 14%: +1 año | Albumina < 4.0: +2 años | PCR > 3.0: +2 años
- VitD > 60 ng/mL: -1 año | HbA1c < 5.2%: -1 año | GFR > 90: -0.5 años
- Ferritina > 200 (hombres) o > 150 (mujeres): +1 año

Redondear a entero. longevity_age no puede ser < 18 ni > edad_cronológica + 15.

══════════════════════════════════════════════════════════════
LÓGICA PROPIETARIA LONGEVITY IA — FODA MÉDICA (v2.0)
══════════════════════════════════════════════════════════════

FORTALEZAS (4 exactas): Biomarcadores en rango ÓPTIMO de longevidad que protegen activamente al paciente.
- Criterio: valor en rango óptimo Y tiene evidencia de reducción de mortalidad
- Ejemplo: "HDL 72 mg/dL → protección endotelial activa (Barter, NEJM 2007: cada +1 mg/dL HDL = -2% riesgo CV)"
- Incluir expectedImpact cuantificado

DEBILIDADES (3 exactas): Biomarcadores en rango WARNING o DANGER que representan riesgo actual.
- Criterio: valor fuera de rango óptimo con evidencia de aumento de mortalidad/morbilidad
- Ejemplo: "LDL 155 mg/dL → aterogénesis activa (Ference, JAMA 2022: cada +10 mg/dL = +22% riesgo CV acumulado)"
- Incluir probability (Alta/Media/Baja) de progresión

OPORTUNIDADES (4 exactas): Intervenciones disponibles con alta probabilidad de mejorar las debilidades.
- Criterio: existe intervención con evidencia nivel 1-2 que puede mover el biomarcador al rango óptimo
- Ejemplo: "Berberina 500mg 3x/día puede reducir LDL -20% en 8 semanas (Liang, Endocr Rev 2022)"
- Incluir expectedImpact cuantificado

AMENAZAS (3 exactas): Enfermedades o condiciones futuras DERIVADAS de las debilidades actuales si no se interviene.
- Criterio: riesgo proyectado basado en el biomarcador alterado + historia familiar + edad
- Ejemplo: "Aterosclerosis subclínica → evento CV mayor en 5-10 años si LDL persiste >130 (Pencina, Circulation 2019)"
- Incluir probability (Alta/Media/Baja)

REGLA: Cada punto del FODA debe estar DIRECTAMENTE vinculado a un biomarcador del paciente con su valor actual. No usar generalidades.

══════════════════════════════════════════════════════════════
LÓGICA PROPIETARIA LONGEVITY IA — PROYECCIÓN 10 AÑOS (v2.0)
══════════════════════════════════════════════════════════════

projectionData: 10 puntos (años 1-10), cada uno con withoutIntervention y withIntervention (scores 0-100).

Cálculo SIN intervención (deterioro natural):
- Año 1: overallScore actual
- Años 2-10: score_anterior × factor_deterioro_anual
- Factor deterioro = 0.97 si overallScore > 70 (deterioro lento del 3%/año)
- Factor deterioro = 0.94 si overallScore 40-70 (deterioro moderado del 6%/año)
- Factor deterioro = 0.90 si overallScore < 40 (deterioro rápido del 10%/año)
- Modificador edad: si >60 años, multiplicar deterioro por 1.02 adicional por año
- Mínimo: 15 (no puede bajar de 15)

Cálculo CON intervención (mejora terapéutica):
- Año 1: overallScore + (100 - overallScore) × 0.15 (mejora del 15% del gap al óptimo)
- Años 2-3: mejora acumulativa adicional × 0.10/año (efecto terapéutico máximo)
- Años 4-10: meseta con mantenimiento × 0.995/año (leve deterioro natural compensado)
- Máximo: 95 (no puede alcanzar 100, siempre hay envejecimiento)

yearRisk por año: máx 2 biomarcadores en riesgo, máx 2 condiciones posibles, 1 frase de urgencia.

projectionFactors: exactamente 3 factores — los 3 biomarcadores con MAYOR impacto en la proyección del paciente (los más alterados o los más protectores). Cada uno con currentValue, optimalValue, medicalJustification (1 oración con autor+año+efecto), withoutProtocol (pronóstico sin intervenir), withProtocol (pronóstico con intervención).

══════════════════════════════════════════════════════════════
LÓGICA PROPIETARIA LONGEVITY IA — JERARQUÍA DE URGENCIA
══════════════════════════════════════════════════════════════

Cada intervención del protocolo recibe una urgencia basada en el biomarcador objetivo:
- "immediate": biomarcador en rango DANGER que pone en riesgo la vida o un órgano (ej: GFR <30, glucosa >250, PCR >10, plaquetas <50k)
- "high": biomarcador en rango DANGER sin riesgo vital inmediato (ej: LDL >190, HbA1c >8%, VitD <15, ferritina >500)
- "medium": biomarcador en rango WARNING (ej: LDL 130-189, glucosa 100-125, VitD 20-39, GGT 40-80)
- "low": biomarcador en rango NORMAL pero subóptimo para longevidad (ej: LDL 70-129, VitD 40-59, optimización preventiva)

PRINCIPIOS INAMOVIBLES:
- Usa SIEMPRE rangos óptimos de longevidad, nunca solo rangos de referencia convencionales
- Cada recomendación DEBE citar autor, institución, revista, año y magnitud del efecto
- Cruza valores del paciente con estudios de mortalidad relevantes
- Calcula edad biológica con la fórmula propietaria de arriba
- Responde ÚNICAMENTE con JSON válido, sin markdown ni texto adicional
- Todo el texto en español mexicano, técnico y preciso`

const USER_PROMPT = `Extrae, interpreta y analiza TODOS los biomarcadores del documento usando rangos óptimos de longevidad.

RANGOS ÓPTIMOS DE LONGEVIDAD (más estrictos que referencia convencional):
Glucosa: 70-88 mg/dL | LDL: <70 mg/dL | Colesterol Total: <180 | HDL: >60 (H>55, M>65) | TG: <100 | TG/HDL: <1.5
HbA1c: <5.4% | Insulina: <5 uIU/mL | VitD: 60-80 ng/mL | PCR: <0.5 mg/L | Homocisteína: <8 umol/L
GFR: >90 | Albumina: >4.5 g/dL | Ferritina: 50-100 H / 30-80 M | TSH: 0.5-2.0 | Ácido úrico: 3.5-5.5
AST/ALT: <25 U/L | GGT: <20 U/L | Testosterona: 600-900 H / 50-80 M | B12: 600-1200 | RDW: <13%
Plaquetas: 175-300 | Creatinina: 0.7-1.2 H / 0.5-0.9 M

Calcula systemScores, overallScore, longevity_age, FODA, risks y proyección usando la LÓGICA PROPIETARIA LONGEVITY IA definida en el system prompt.

PROTOCOLO — 8-12 intervenciones de ≥4 categorías distintas:

Categorías: Suplementación | Farmacológico | Péptido terapéutico | Estilo de vida | Nutrición terapéutica | Hormonal/Endocrino | Senolítico/Anti-aging | Neuroprotección | Microbioma | Hepatoprotección | Inmunomodulación | Medicina regenerativa (hUC-MSC/Exosomas)

WHITELIST DE INTERVENCIONES (selecciona SOLO las justificadas por biomarcadores del paciente):
CV: Omega-3 EPA (Bhatt REDUCE-IT -25% MACE) | Berberina (LDL -20%) | CoQ10 Ubiquinol | Ajo envejecido | Citrus bergamot | Nattokinasa
Metabólico: Metformina (TAME Trial) | Cromo picolinato | R-ALA | Canela Ceylán | Inositol | FMD (Longo)
Inflamación: GlyNAC (Kumar Baylor, 8/9 marcadores) | Curcumina liposomal | Boswellia AKBA | Sulforafano | Quercetina | Astaxantina
Mitocondrial: NMN 500-1000mg | NR 300-600mg | PQQ | Creatina | ALCAR | Urolitina A (Amazentis ATLAS)
Vitaminas: VitD3+K2 MK-7 | Magnesio glicinato/treonato | Zinc picolinato | Selenio | B12 metilcobalamina | Complejo B metilado | VitC liposomal | Hierro (SOLO si ferritina<30)
Hormonal: DHEA | Ashwagandha KSM-66 | Tongkat Ali | Maca | DIM | Melatonina
Neuro: Mg L-treonato | Lion's Mane | Fosfatidilserina | L-Teanina | Bacopa | Rhodiola | Citicolina
Hepático: NAC | Silimarina | TUDCA | Fosfatidilcolina
Intestinal: Probiótico multi-cepa | L-Glutamina | Butirato | Fibra prebiótica
Inmune: Beta-glucanos | Lactoferrina | Calostro bovino | AHCC | Astrágalo
Senolítico (>50a): D+Q (Hickson Mayo) | Fisetin (Kirkland) | Rapamicina intermitente | Spermidina
hUC-MSC: ÚNICAS células madre permitidas = cordón umbilical. Dosis 1×10⁶/kg IV. Citar: Longeveron/Miami, Duke/Kurtzberg, Chinese Academy Sciences, Karolinska, Toronto. NUNCA médula ósea ni tejido adiposo. Exosomas hUC-MSC como alternativa cell-free.
Péptidos: BPC-157 | TB-500 | Thymosin Alpha-1 | CJC-1295/Ipamorelin | GHK-Cu | SS-31
Estilo de vida: Zone 2 (150-200 min/sem) | Fuerza 2-3x/sem | HIIT 1-2x/sem | TRE 16:8 | Frío | Sueño 7-9h | Meditación | Sauna IR

══ INTERACCIONES FARMACOLÓGICAS — VERIFICAR ANTES DE INCLUIR ══
- Omega-3 altas dosis + Nattokinasa/anticoagulantes = riesgo sangrado excesivo → NO combinar
- Metformina + Berberina = riesgo hipoglucemia → elegir UNA, no ambas
- NAC + Nitroglicerina = hipotensión severa → contraindicado
- Ashwagandha + inmunosupresores = antagonismo → excluir si autoinmune tratada
- Hierro + antiácidos/calcio/té = absorción reducida → separar horarios si se incluye
- Vitamina K2 + warfarina/acenocumarol = antagonismo anticoagulante → excluir K2
- Curcumina + ciclosporina = aumento niveles → ajustar o excluir
- DHEA + tamoxifeno/inhibidores aromatasa = antagonismo hormonal → excluir
- Melatonina + sedantes/benzodiazepinas = sedación excesiva → ajustar dosis
- Zinc >40mg/día sin cobre = deficiencia de cobre → agregar Cu 2mg si Zn >30mg

══ CONTRAINDICACIONES POR CONDICIÓN MÉDICA ══
- Insuficiencia renal (GFR <45): reducir/excluir metformina, creatina, magnesio. Ajustar dosis de todos los compuestos renalmente excretados.
- Insuficiencia hepática (ALT/AST >3x normal): excluir niacina, metformina. Reducir dosis de compuestos con metabolismo hepático.
- Embarazo/lactancia: excluir rapamicina, dasatinib, péptidos experimentales, senolíticos, metformina (salvo indicación obstétrica).
- Enfermedades autoinmunes activas (lupus, AR, EM): precaución con inmunoestimulantes (beta-glucanos, astrágalo, calostro). Preferir inmunomoduladores (hUC-MSC, curcumina).
- Anticoagulación activa (warfarina, DOACs): excluir nattokinasa, omega-3 altas dosis (>2g), vitamina K2. Nattokinasa ABSOLUTAMENTE contraindicada.
- Diabetes tipo 1: excluir gymnema, berberina (riesgo hipoglucemia). Metformina con precaución.
- Cáncer activo: excluir DHEA, testosterona, factores de crecimiento (CJC-1295). hUC-MSC contraindicado sin aprobación oncológica.

REGLA CRÍTICA DE NO-DUPLICACIÓN: Cada molécula UNA SOLA VEZ. Si tiene múltiples beneficios, combínalos en un solo "mechanism". CoQ10=Ubiquinol, NMN≠NR (elegir uno), Omega-3 EPA=DHA=fish oil (elegir forma).

Formato dosis: siempre "Xmg Nx/día" o "Xmg N veces por semana" (estandarizado).
clinicalTrial: nombre del ensayo si existe, o "Sin ensayo nombrado — evidencia: Autor, Revista, Año" si no hay ensayo clínico formal.

Genera ÚNICAMENTE este JSON:

{
  "parsedData": {
    "hematology": { "rbc": null, "hemoglobin": null, "hematocrit": null, "mcv": null, "mch": null, "mchc": null, "rdw": null, "wbc": null, "neutrophils": null, "lymphocytes": null, "monocytes": null, "eosinophils": null, "platelets": null, "mpv": null },
    "metabolic": { "glucose": null, "urea": null, "bun": null, "creatinine": null, "gfr": null, "uricAcid": null },
    "lipids": { "totalCholesterol": null, "triglycerides": null, "hdl": null, "ldl": null, "vldl": null, "nonHdl": null, "atherogenicIndex": null, "ldlHdlRatio": null, "tgHdlRatio": null },
    "liver": { "alkalinePhosphatase": null, "ast": null, "alt": null, "ggt": null, "ldh": null, "totalProtein": null, "albumin": null, "globulin": null, "amylase": null, "totalBilirubin": null },
    "vitamins": { "vitaminD": null, "vitaminB12": null, "ferritin": null },
    "hormones": { "tsh": null, "testosterone": null, "cortisol": null, "insulin": null, "hba1c": null },
    "inflammation": { "crp": null, "homocysteine": null }
  },
  "aiAnalysis": {
    "systemScores": { "cardiovascular": 0, "metabolic": 0, "hepatic": 0, "renal": 0, "immune": 0, "hematologic": 0, "inflammatory": 0, "vitamins": 0 },
    "overallScore": 0,
    "longevity_age": 0,
    "clinicalSummary": "2-3 oraciones con hallazgos más importantes",
    "keyAlerts": [{ "title": "", "description": "", "level": "warning|danger", "value": "", "target": "" }],
    "swot": {
      "strengths": [{ "label": "máx 5 palabras", "detail": "1 oración mecanismo", "evidence": "Autor, Revista, Año", "expectedImpact": "dato cuantificado" }],
      "weaknesses": [{ "label": "", "detail": "", "evidence": "", "probability": "Alta|Media|Baja" }],
      "opportunities": [{ "label": "", "detail": "", "evidence": "", "expectedImpact": "" }],
      "threats": [{ "label": "", "detail": "", "evidence": "", "probability": "Alta|Media|Baja" }]
    },
    "risks": [{ "disease": "", "probability": 0, "horizon": "X años", "drivers": ["biomarcador: valor"], "color": "#hexcolor" }],
    "protocol": [{ "number": 1, "category": "", "molecule": "", "dose": "", "mechanism": "", "evidence": "", "clinicalTrial": "", "targetBiomarkers": [], "expectedResult": "", "action": "", "urgency": "immediate|high|medium|low" }],
    "projectionData": [{ "year": 1, "withoutIntervention": 0, "withIntervention": 0, "yearRisk": { "biomarkers": [], "conditions": [], "urgencyNote": "" } }],
    "projectionFactors": [{ "factor": "", "currentValue": "", "optimalValue": "", "medicalJustification": "", "withoutProtocol": "", "withProtocol": "" }]
  }
}

FORMATO:
- Biomarcador: { "value": número, "unit": "", "refMin": num, "refMax": num, "optMin": num, "optMax": num, "status": "optimal|normal|warning|danger" }. Si no está en documento: null
- keyAlerts: máximo 4. FODA: 4 fortalezas, 3 debilidades, 4 oportunidades, 3 amenazas (vinculados a biomarcadores con valor)
- risks: exactamente 4 enfermedades. Colores: CV=#ff4d6d, metabólico=#f5a623, hepático=#a78bfa, renal=#38bdf8
- projectionData: 10 puntos (años 1-10). projectionFactors: 3 factores
- Todo en español mexicano, técnico y preciso. Solo analiza lo que está en el documento.`

export interface AnalyzeFileParams {
  fileBase64: string
  fileType: 'image' | 'pdf'
  mimeType: string
}

export interface AnalyzeResult {
  parsedData: object
  aiAnalysis: object
}

// ─── Formatea la historia clínica como bloque de texto para el prompt ─────────

export interface ClinicalHistoryForPrompt {
  anthropometric: {
    waist_cm: number | null
    blood_pressure: string | null
    energy_level: string | null
  }
  allergies: {
    food: string | null
    medication: string | null
    environmental: string | null
  }
  diet: {
    type: string
    meals_per_day: string
    water_intake: string | null
    processed_food: string | null
    alcohol: string
    supplements: string | null
  }
  physical_activity: {
    type: string | null
    frequency: string | null
    sedentary_hours: string | null
  }
  sleep: {
    hours: string
    quality: string | null
    snoring: string | null
  }
  mental_health: {
    stress_level: string
    mood: string | null
    anxiety: string | null
    cognitive: string | null
  }
  cardiovascular: {
    chest_pain: string | null
    shortness_of_breath: string | null
    palpitations: string | null
    thyroid_symptoms: string | null
    hormonal_symptoms: string | null
  }
  medical_history: {
    chronic_conditions: string[]
    surgeries: string | null
    smoker: string
    current_medications: string | null
    recent_condition: string | null
    recent_treatment: string | null
  }
  family_history: {
    conditions: string[]
    longevity: string | null
    details: string | null
  }
}

export interface PatientContextForPrompt {
  name: string
  age: number
  gender: string
  weight: number | null
  height: number | null
  clinical_history: ClinicalHistoryForPrompt | null
}

function formatClinicalHistory(patient: PatientContextForPrompt): string {
  const h = patient.clinical_history as Record<string, unknown> | null
  if (!h) return ''

  const bmi = patient.weight && patient.height
    ? (patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1)
    : null

  const lines: string[] = [
    '=== HISTORIA CLÍNICA COMPLETA DEL PACIENTE (UpToDate Clinical Assessment) ===',
    `Nombre: ${patient.name} | Edad: ${patient.age} años | Género: ${patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : 'Otro'}`,
  ]

  if (patient.weight) lines.push(`Peso: ${patient.weight} kg | Talla: ${patient.height} cm${bmi ? ` | IMC calculado: ${bmi}` : ''}`)

  // Antropométrico
  const anthro = h['anthropometric'] as Record<string, unknown> | undefined
  if (anthro) {
    if (anthro['waist_cm']) lines.push(`Circunferencia de cintura: ${anthro['waist_cm']} cm`)
    if (anthro['blood_pressure']) lines.push(`Presión arterial habitual (autorreportada): ${anthro['blood_pressure']} mmHg`)
    if (anthro['energy_level']) lines.push(`Nivel de energía habitual: ${anthro['energy_level']}`)
  }

  // Alergias
  const allerg = h['allergies'] as Record<string, unknown> | undefined
  if (allerg) {
    lines.push('--- ALERGIAS ---')
    lines.push(`Alergias alimentarias: ${allerg['food'] || 'Ninguna reportada'}`)
    if (allerg['medication']) {
      lines.push(`⚠ ALERGIA A MEDICAMENTO: ${allerg['medication']} — NO incluir este medicamento ni sus derivados en el protocolo`)
    } else {
      lines.push('Alergias a medicamentos: Ninguna reportada')
    }
    if (allerg['environmental']) lines.push(`Alergias ambientales: ${allerg['environmental']}`)
  }

  // Alimentación
  const diet = h['diet'] as Record<string, unknown> | undefined
  if (diet) {
    lines.push('--- ALIMENTACIÓN Y NUTRICIÓN ---')
    if (diet['type']) lines.push(`Patrón alimentario: ${diet['type']}`)
    if (diet['meals_per_day']) lines.push(`Frecuencia de comidas: ${diet['meals_per_day']}`)
    if (diet['water_intake']) lines.push(`Hidratación: ${diet['water_intake']} al día`)
    if (diet['processed_food']) lines.push(`Consumo de ultraprocesados: ${diet['processed_food']}`)
    if (diet['alcohol']) lines.push(`Consumo de alcohol: ${diet['alcohol']}`)
    if (diet['supplements']) lines.push(`Suplementos actuales (no duplicar sin razón): ${diet['supplements']}`)
  }

  // Actividad física
  const pa = h['physical_activity'] as Record<string, unknown> | undefined
  if (pa) {
    lines.push('--- ACTIVIDAD FÍSICA ---')
    if (pa['type']) lines.push(`Tipo de ejercicio: ${pa['type']}`)
    if (pa['frequency']) lines.push(`Frecuencia de ejercicio: ${pa['frequency']}`)
    if (pa['sedentary_hours']) lines.push(`Horas sedentario/a al día: ${pa['sedentary_hours']}`)
  }

  // Sueño
  const sleep = h['sleep'] as Record<string, unknown> | undefined
  if (sleep) {
    lines.push('--- SUEÑO ---')
    if (sleep['hours']) lines.push(`Horas de sueño: ${sleep['hours']}`)
    if (sleep['quality']) lines.push(`Calidad de sueño: ${sleep['quality']}`)
    if (sleep['snoring'] && sleep['snoring'] !== 'No / No sé') lines.push(`Ronquido/apnea: ${sleep['snoring']}`)
  }

  // Salud mental
  const mh = h['mental_health'] as Record<string, unknown> | undefined
  if (mh) {
    lines.push('--- SALUD MENTAL Y COGNITIVA ---')
    if (mh['stress_level']) lines.push(`Nivel de estrés: ${mh['stress_level']}`)
    if (mh['mood']) lines.push(`Estado de ánimo: ${mh['mood']}`)
    if (mh['anxiety']) lines.push(`Ansiedad: ${mh['anxiety']}`)
    if (mh['cognitive']) lines.push(`Función cognitiva: ${mh['cognitive']}`)
  }

  // Cardiovascular
  const cv = h['cardiovascular'] as Record<string, unknown> | undefined
  if (cv) {
    lines.push('--- SALUD CARDIOVASCULAR Y METABÓLICA ---')
    if (cv['chest_pain']) lines.push(`Dolor o presión en pecho: ${cv['chest_pain']}`)
    if (cv['shortness_of_breath']) lines.push(`Disnea: ${cv['shortness_of_breath']}`)
    if (cv['palpitations']) lines.push(`Palpitaciones: ${cv['palpitations']}`)
    if (cv['thyroid_symptoms']) lines.push(`Síntomas tiroideos: ${cv['thyroid_symptoms']}`)
    if (cv['hormonal_symptoms']) lines.push(`Síntomas hormonales: ${cv['hormonal_symptoms']}`)
  }

  // Historial médico personal
  const mhist = h['medical_history'] as Record<string, unknown> | undefined
  if (mhist) {
    lines.push('--- HISTORIAL MÉDICO PERSONAL ---')
    const conditions = mhist['chronic_conditions'] as string[] | undefined
    if (conditions && conditions.length > 0) lines.push(`Condiciones crónicas diagnosticadas: ${conditions.join(', ')}`)
    if (mhist['surgeries']) lines.push(`Cirugías/procedimientos: ${mhist['surgeries']}`)
    if (mhist['smoker']) lines.push(`Tabaco: ${mhist['smoker']}`)
    if (mhist['current_medications']) {
      lines.push(`⚠ MEDICAMENTOS ACTUALES (no duplicar en protocolo, solo complementar): ${mhist['current_medications']}`)
    }
    if (mhist['recent_condition']) lines.push(`Condición médica reciente: ${mhist['recent_condition']}`)
    if (mhist['recent_treatment']) lines.push(`Tratamiento indicado: ${mhist['recent_treatment']}`)
  }

  // Historial familiar
  const fam = h['family_history'] as Record<string, unknown> | undefined
  if (fam) {
    lines.push('--- HISTORIAL FAMILIAR ---')
    const famConditions = fam['conditions'] as string[] | undefined
    if (famConditions && famConditions.length > 0) {
      lines.push(`Condiciones en familiares de primer grado: ${famConditions.join(', ')}`)
    }
    if (fam['longevity']) lines.push(`Longevidad familiar: ${fam['longevity']}`)
    if (fam['details']) lines.push(`Detalles: ${fam['details']}`)
  }

  // Campos legacy (compatibilidad con historias antiguas)
  const legacy_lifestyle = h['lifestyle'] as Record<string, unknown> | undefined
  if (legacy_lifestyle) {
    lines.push('--- ESTILO DE VIDA (datos anteriores) ---')
    if (legacy_lifestyle['exercise']) lines.push(`Actividad física: ${legacy_lifestyle['exercise']}`)
    if (legacy_lifestyle['sleep_hours']) lines.push(`Sueño: ${legacy_lifestyle['sleep_hours']}`)
    if (legacy_lifestyle['smoker']) lines.push(`Tabaco: ${legacy_lifestyle['smoker']}`)
    if (legacy_lifestyle['stress_level']) lines.push(`Estrés: ${legacy_lifestyle['stress_level']}`)
  }
  const legacy_recent = h['recent_illness'] as Record<string, unknown> | undefined
  if (legacy_recent) {
    if (legacy_recent['condition']) lines.push(`Enfermedad reciente (dato anterior): ${legacy_recent['condition']}`)
    if (legacy_recent['current_medications']) lines.push(`⚠ Medicamentos (dato anterior): ${legacy_recent['current_medications']}`)
  }

  lines.push('=== FIN DE HISTORIA CLÍNICA ===')
  lines.push('INSTRUCCIONES ESPECIALES: Usa esta historia clínica para personalizar el análisis de forma integral: (1) Ajusta el protocolo según actividad física, dieta y suplementos actuales; (2) Considera los riesgos familiares en el FODA; (3) NUNCA recomendar medicamentos a los que el paciente sea alérgico; (4) Evalúa síntomas cardiovasculares y cognitivos como señales de alerta; (5) Ajusta la edad biológica según nivel de energía, calidad de sueño, manejo del estrés y horas sedentarias.')

  return lines.join('\n')
}

// ─── Helpers de validación de tipos ─────────────────────────────────────────

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && !isNaN(v)
}

function clampScore(v: unknown, fallback = 50): number {
  if (!isNumber(v)) return fallback
  return Math.max(0, Math.min(100, Math.round(v)))
}

function ensureString(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v
  if (v === null || v === undefined) return fallback
  return String(v)
}

function ensureArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

const VALID_URGENCIES = new Set(['immediate', 'high', 'medium', 'low'])
const VALID_STATUSES = new Set(['optimal', 'normal', 'warning', 'danger'])
const VALID_LEVELS = new Set(['optimal', 'normal', 'warning', 'danger'])

function validateBiomarkerValue(v: unknown): object | null {
  if (!v || typeof v !== 'object') return null
  const bm = v as Record<string, unknown>
  if (bm.value === null || bm.value === undefined) return null
  return {
    value: isNumber(bm.value) ? bm.value : null,
    unit: ensureString(bm.unit),
    refMin: isNumber(bm.refMin) ? bm.refMin : null,
    refMax: isNumber(bm.refMax) ? bm.refMax : null,
    optMin: isNumber(bm.optMin) ? bm.optMin : null,
    optMax: isNumber(bm.optMax) ? bm.optMax : null,
    status: VALID_STATUSES.has(ensureString(bm.status)) ? bm.status : null,
  }
}

function validateParsedDataSection(section: unknown): object | null {
  if (!section || typeof section !== 'object') return null
  const obj = section as Record<string, unknown>
  const result: Record<string, object | null> = {}
  let hasData = false
  for (const [key, val] of Object.entries(obj)) {
    const validated = validateBiomarkerValue(val)
    result[key] = validated
    if (validated) hasData = true
  }
  return hasData ? result : null
}

function validateSystemScores(raw: unknown): Record<string, number> {
  const EXPECTED_KEYS = ['cardiovascular', 'metabolic', 'hepatic', 'renal', 'immune', 'hematologic', 'inflammatory', 'vitamins']
  const scores: Record<string, number> = {}
  const obj = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw as Record<string, unknown> : {}
  for (const key of EXPECTED_KEYS) {
    scores[key] = clampScore(obj[key])
  }
  return scores
}

function validateProtocolItem(raw: unknown, index: number): object {
  const item = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}
  const urgency = ensureString(item.urgency, 'medium')
  return {
    number: isNumber(item.number) ? item.number : index + 1,
    category: ensureString(item.category, 'Suplementación'),
    molecule: ensureString(item.molecule, 'Sin especificar'),
    dose: ensureString(item.dose),
    mechanism: ensureString(item.mechanism),
    evidence: ensureString(item.evidence),
    clinicalTrial: ensureString(item.clinicalTrial),
    targetBiomarkers: ensureArray(item.targetBiomarkers).map(b => ensureString(b)).filter(Boolean),
    expectedResult: ensureString(item.expectedResult),
    action: ensureString(item.action),
    urgency: VALID_URGENCIES.has(urgency) ? urgency : 'medium',
  }
}

function validateKeyAlert(raw: unknown): object | null {
  // Handle plain strings (legacy format)
  if (typeof raw === 'string' && raw.trim()) {
    return { title: raw.trim(), description: '', level: 'warning', value: '', target: '' }
  }
  if (!raw || typeof raw !== 'object') return null
  const alert = raw as Record<string, unknown>
  const title = ensureString(alert.title || alert.label)
  if (!title) return null
  const level = ensureString(alert.level, 'warning')
  return {
    title,
    description: ensureString(alert.description || alert.detail),
    level: VALID_LEVELS.has(level) ? level : 'warning',
    value: ensureString(alert.value),
    target: ensureString(alert.target),
  }
}

function validateSwotItem(raw: unknown): object {
  if (typeof raw === 'string') return { label: raw, detail: '' }
  if (!raw || typeof raw !== 'object') return { label: String(raw ?? ''), detail: '' }
  const item = raw as Record<string, unknown>
  return {
    label: ensureString(item.label || item.title || item.name),
    detail: ensureString(item.detail || item.description || item.desc),
    ...(item.evidence ? { evidence: ensureString(item.evidence) } : {}),
    ...(item.expectedImpact ? { expectedImpact: ensureString(item.expectedImpact) } : {}),
    ...(item.probability ? { probability: ensureString(item.probability) } : {}),
  }
}

function validateSwot(raw: unknown): object {
  const swot = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw as Record<string, unknown> : {}
  return {
    strengths: ensureArray(swot.strengths).map(validateSwotItem),
    weaknesses: ensureArray(swot.weaknesses).map(validateSwotItem),
    opportunities: ensureArray(swot.opportunities).map(validateSwotItem),
    threats: ensureArray(swot.threats).map(validateSwotItem),
  }
}

function validateRisk(raw: unknown): object | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const disease = ensureString(r.disease || r.name)
  // Skip placeholder/template entries or empty disease names
  if (!disease || disease === 'Nombre de enfermedad' || disease === 'Nombre') return null
  return {
    disease,
    probability: isNumber(r.probability) ? Math.max(0, Math.min(100, r.probability)) : 0,
    horizon: ensureString(r.horizon),
    drivers: ensureArray(r.drivers).map(d => ensureString(d)).filter(Boolean),
    color: ensureString(r.color, '#f5a623'),
  }
}

function validateProjectionPoint(raw: unknown, index: number): object {
  const p = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}
  const yearRisk = (p.yearRisk && typeof p.yearRisk === 'object') ? p.yearRisk as Record<string, unknown> : {}
  return {
    year: isNumber(p.year) ? p.year : index + 1,
    withoutIntervention: clampScore(p.withoutIntervention),
    withIntervention: clampScore(p.withIntervention),
    yearRisk: {
      biomarkers: ensureArray(yearRisk.biomarkers).map(b => ensureString(b)).filter(Boolean),
      conditions: ensureArray(yearRisk.conditions).map(c => ensureString(c)).filter(Boolean),
      urgencyNote: ensureString(yearRisk.urgencyNote),
    },
  }
}

function validateProjectionFactor(raw: unknown): object | null {
  if (!raw || typeof raw !== 'object') return null
  const f = raw as Record<string, unknown>
  return {
    factor: ensureString(f.factor),
    currentValue: ensureString(f.currentValue),
    optimalValue: ensureString(f.optimalValue),
    medicalJustification: ensureString(f.medicalJustification),
    withoutProtocol: ensureString(f.withoutProtocol),
    withProtocol: ensureString(f.withProtocol),
  }
}

// ─── Deduplicación de protocolo ─────────────────────────────────────────────

/** Normaliza el nombre de una molécula para comparación (lowercase, sin dosis, sin paréntesis) */
function normalizeMolecule(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, ' ')       // quitar paréntesis y su contenido
    .replace(/\d+\s*(mg|mcg|g|iu|ui|ml|µg|kg)\b/gi, '') // quitar dosis
    .replace(/[^a-záéíóúñü\s-]/g, '')     // solo letras y espacios
    .replace(/\s+/g, ' ')
    .trim()
}

/** Mapa de variantes conocidas que son la misma sustancia */
const MOLECULE_ALIASES: Record<string, string> = {
  'ubiquinol': 'coq10',
  'ubiquinona': 'coq10',
  'coenzima q10': 'coq10',
  'coenzyme q10': 'coq10',
  'nicotinamida mononucleótido': 'nmn',
  'nicotinamide mononucleotide': 'nmn',
  'nicotinamida ribósido': 'nr',
  'nicotinamide riboside': 'nr',
  'vitamina d3': 'vitamina d',
  'colecalciferol': 'vitamina d',
  'epa': 'omega-3',
  'dha': 'omega-3',
  'icosapent etil': 'omega-3',
  'aceite de pescado': 'omega-3',
  'fish oil': 'omega-3',
  'ácido eicosapentaenoico': 'omega-3',
  'melatonina': 'melatonina',
  'n-acetilcisteína': 'nac',
  'n-acetil cisteína': 'nac',
  'metilcobalamina': 'vitamina b12',
  'cianocobalamina': 'vitamina b12',
  'ácido fólico': 'folato',
  'metilfolato': 'folato',
  'l-metilfolato': 'folato',
}

function canonicalMolecule(name: string): string {
  const normalized = normalizeMolecule(name)
  // Check aliases
  for (const [alias, canonical] of Object.entries(MOLECULE_ALIASES)) {
    if (normalized.includes(alias)) return canonical
  }
  return normalized
}

/**
 * Elimina moléculas duplicadas del protocolo in-place.
 * Mantiene la primera aparición y renumera los items.
 */
function deduplicateProtocol(protocol: object[]): void {
  const seen = new Set<string>()
  const toRemove: number[] = []

  for (let i = 0; i < protocol.length; i++) {
    const item = protocol[i] as Record<string, unknown>
    const molecule = String(item.molecule ?? '')
    const canonical = canonicalMolecule(molecule)

    if (seen.has(canonical)) {
      toRemove.push(i)
    } else {
      seen.add(canonical)
    }
  }

  // Eliminar duplicados de atrás hacia adelante
  for (let i = toRemove.length - 1; i >= 0; i--) {
    protocol.splice(toRemove[i], 1)
  }

  // Renumerar
  for (let i = 0; i < protocol.length; i++) {
    (protocol[i] as Record<string, unknown>).number = i + 1
  }
}

// ─── Validación compartida del JSON de respuesta ──────────────────────────────

function validateAndParseAiResponse(rawText: string): { parsedData?: object; aiAnalysis: object } {
  if (!rawText) throw new Error('Claude no devolvió respuesta.')

  const firstBrace = rawText.indexOf('{')
  const lastBrace = rawText.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`La respuesta no contiene JSON válido. Respuesta: ${rawText.substring(0, 300)}...`)
  }

  let parsed: Record<string, unknown>
  const jsonSlice = rawText.slice(firstBrace, lastBrace + 1)
  try {
    parsed = JSON.parse(jsonSlice)
  } catch {
    const tail = rawText.slice(-200)
    throw new Error(`JSON inválido o truncado. Longitud respuesta: ${rawText.length} chars. Final: ...${tail}`)
  }

  // Acepta tanto { parsedData, aiAnalysis } como { aiAnalysis } directo
  const rawAi = (parsed.aiAnalysis ?? parsed) as Record<string, unknown>

  // ── Validación profunda de aiAnalysis ──────────────────────────
  const systemScores = validateSystemScores(rawAi.systemScores)
  const overallScore = clampScore(rawAi.overallScore)
  const longevity_age = isNumber(rawAi.longevity_age) ? Math.max(0, Math.min(150, rawAi.longevity_age)) : 0
  const clinicalSummary = ensureString(rawAi.clinicalSummary)
  const keyAlerts = ensureArray(rawAi.keyAlerts).map(validateKeyAlert).filter(Boolean)
  const swot = validateSwot(rawAi.swot)
  const risks = ensureArray(rawAi.risks).map(validateRisk).filter(Boolean)
  const protocol = ensureArray(rawAi.protocol).map((item, i) => validateProtocolItem(item, i))
  const projectionData = ensureArray(rawAi.projectionData).map((p, i) => validateProjectionPoint(p, i))
  const projectionFactors = ensureArray(rawAi.projectionFactors).map(validateProjectionFactor).filter(Boolean)

  // Validar que haya contenido mínimo
  if (protocol.length === 0) throw new Error('El protocolo no contiene intervenciones')
  if (projectionData.length === 0) throw new Error('No hay datos de proyección')

  // Asegurar que molecule nunca esté vacío
  for (const p of protocol) {
    const item = p as Record<string, unknown>
    if (!item.molecule || item.molecule === 'Sin especificar') {
      item.molecule = `Intervención #${item.number}`
    }
  }

  // ── Deduplicar protocolo: eliminar moléculas repetidas ────────
  deduplicateProtocol(protocol)

  const aiAnalysis = {
    systemScores,
    overallScore,
    longevity_age,
    clinicalSummary,
    keyAlerts,
    swot,
    risks,
    protocol,
    projectionData,
    projectionFactors,
  }

  // ── Validación de parsedData ───────────────────────────────────
  let validatedParsedData: object | undefined
  if (parsed.parsedData && typeof parsed.parsedData === 'object') {
    const pd = parsed.parsedData as Record<string, unknown>
    validatedParsedData = {
      hematology: validateParsedDataSection(pd.hematology),
      metabolic: validateParsedDataSection(pd.metabolic),
      lipids: validateParsedDataSection(pd.lipids),
      liver: validateParsedDataSection(pd.liver),
      vitamins: validateParsedDataSection(pd.vitamins),
      hormones: validateParsedDataSection(pd.hormones),
      inflammation: validateParsedDataSection(pd.inflammation),
    }
  }

  return {
    parsedData: validatedParsedData,
    aiAnalysis,
  }
}

// ─── Paso 1: Extraer solo biomarcadores del archivo (sin análisis IA) ────────

const EXTRACT_PROMPT = `TAREA: Extrae TODOS los valores de biomarcadores de este documento de laboratorio clínico.

Lee CADA valor numérico del documento. No omitas ningún biomarcador presente. Identifica unidades y compáralas con los rangos de referencia del laboratorio emisor.

Clasifica cada biomarcador encontrado con rangos óptimos de longevidad (más estrictos que los convencionales):
- Glucosa en ayuno: óptimo 70-88 mg/dL
- LDL: óptimo <70 mg/dL
- HDL: óptimo >60 mg/dL
- Triglicéridos: óptimo <100 mg/dL
- HbA1c: óptimo <5.4%
- Vitamina D 25-OH: óptimo 60-80 ng/mL
- PCR: óptimo <0.5 mg/L
- Homocisteína: óptimo <8 umol/L
- GFR: óptimo >90 mL/min
- Albumina: óptimo >4.5 g/dL
- Ferritina: óptimo 50-100 ng/mL hombres, 30-80 mujeres
- TSH: óptimo 0.5-2.0 mIU/L
- AST/ALT: óptimo <25 U/L
- GGT: óptimo <20 U/L
- Insulina: óptimo <5 uIU/mL
- Vitamina B12: óptimo 600-1200 pg/mL

Genera ÚNICAMENTE este JSON, sin texto adicional:

{
  "parsedData": {
    "hematology": { "rbc": null, "hemoglobin": null, "hematocrit": null, "mcv": null, "mch": null, "mchc": null, "rdw": null, "wbc": null, "neutrophils": null, "lymphocytes": null, "monocytes": null, "eosinophils": null, "platelets": null, "mpv": null },
    "metabolic": { "glucose": null, "urea": null, "bun": null, "creatinine": null, "gfr": null, "uricAcid": null },
    "lipids": { "totalCholesterol": null, "triglycerides": null, "hdl": null, "ldl": null, "vldl": null, "nonHdl": null, "atherogenicIndex": null, "ldlHdlRatio": null, "tgHdlRatio": null },
    "liver": { "alkalinePhosphatase": null, "ast": null, "alt": null, "ggt": null, "ldh": null, "totalProtein": null, "albumin": null, "globulin": null, "amylase": null, "totalBilirubin": null },
    "vitamins": { "vitaminD": null, "vitaminB12": null, "ferritin": null },
    "hormones": { "tsh": null, "testosterone": null, "cortisol": null, "insulin": null, "hba1c": null },
    "inflammation": { "crp": null, "homocysteine": null }
  }
}

REGLAS:
- Cada biomarcador encontrado: { "value": número, "unit": "unidad", "refMin": número, "refMax": número, "optMin": número, "optMax": número, "status": "optimal|normal|warning|danger" }
- Si un valor NO está en el documento: null
- NO inventes valores. Solo extrae lo que aparece en el documento.
- Usa rangos óptimos de longevidad, no solo rangos de referencia convencionales.`

export async function extractBiomarkers(files: AnalyzeFileParams[], onProgress?: () => void): Promise<object> {
  const userContent: Anthropic.MessageParam['content'] = []

  for (let i = 0; i < files.length; i++) {
    const { fileBase64, fileType, mimeType } = files[i]
    const label = files.length > 1 ? `Archivo ${i + 1} de ${files.length}` : 'Estudio de laboratorio'

    if (fileType === 'image') {
      if (files.length > 1) {
        userContent.push({ type: 'text', text: `--- ${label} (imagen) ---` })
      }
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: fileBase64,
        },
      })
    } else if (fileType === 'pdf') {
      const buffer = Buffer.from(fileBase64, 'base64')
      let pdfText: string
      try {
        const pdfData = await pdfParse(buffer)
        pdfText = pdfData.text
      } catch {
        throw new Error(`No se pudo leer el archivo PDF ${i + 1}. Verifica que no esté protegido con contraseña o intenta con una imagen.`)
      }
      if (!pdfText || pdfText.trim().length < 10) {
        throw new Error(`No se pudo extraer texto del archivo ${i + 1}. Intenta con una imagen del estudio.`)
      }
      userContent.push({ type: 'text', text: `--- ${label} (PDF) ---\n\n${pdfText}` })
    }
  }

  userContent.push({ type: 'text', text: EXTRACT_PROMPT })

  let rawText = ''
  await client.messages
    .stream({
      model: MODEL,
      max_tokens: 8000,
      temperature: 0,
      system: 'Eres un sistema experto en extracción de datos de laboratorio clínico. Extraes biomarcadores con precisión y los clasificas según rangos óptimos de longevidad. Respondes ÚNICAMENTE con JSON válido.',
      messages: [{ role: 'user', content: userContent }],
    })
    .on('text', (text) => { rawText += text; onProgress?.() })
    .finalMessage()

  if (!rawText) throw new Error('Claude no devolvió respuesta en la extracción de biomarcadores.')

  const firstBrace = rawText.indexOf('{')
  const lastBrace = rawText.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1) throw new Error('JSON de extracción inválido.')

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(rawText.slice(firstBrace, lastBrace + 1))
  } catch {
    throw new Error(`JSON de extracción inválido o truncado. Longitud: ${rawText.length} chars.`)
  }

  const rawParsed = (parsed.parsedData ?? parsed) as Record<string, unknown>
  const validatedParsedData: Record<string, object | null> = {
    hematology: validateParsedDataSection(rawParsed.hematology),
    metabolic: validateParsedDataSection(rawParsed.metabolic),
    lipids: validateParsedDataSection(rawParsed.lipids),
    liver: validateParsedDataSection(rawParsed.liver),
    vitamins: validateParsedDataSection(rawParsed.vitamins),
    hormones: validateParsedDataSection(rawParsed.hormones),
    inflammation: validateParsedDataSection(rawParsed.inflammation),
  }

  // Verify at least some data was extracted
  const hasAnyData = Object.values(validatedParsedData).some(v => v !== null)
  if (!hasAnyData) throw new Error('No se encontraron biomarcadores en el documento.')

  return validatedParsedData
}

// ─── Función legacy: extrae Y analiza en una sola llamada (se mantiene por compatibilidad) ──

export async function analyzeLabFiles(files: AnalyzeFileParams[], patientContext?: PatientContextForPrompt, onProgress?: () => void): Promise<AnalyzeResult> {
  const userContent: Anthropic.MessageParam['content'] = []

  // Siempre incluir contexto del paciente para personalización por edad/género/peso
  if (patientContext) {
    if (patientContext.clinical_history) {
      userContent.push({
        type: 'text',
        text: formatClinicalHistory(patientContext),
      })
    } else {
      // Sin historia clínica, pero sí datos demográficos básicos
      const genderLabel = patientContext.gender === 'male' ? 'Masculino' : patientContext.gender === 'female' ? 'Femenino' : 'Otro'
      const bmi = patientContext.weight && patientContext.height
        ? (patientContext.weight / Math.pow(patientContext.height / 100, 2)).toFixed(1)
        : null
      userContent.push({
        type: 'text',
        text: `=== DATOS DEL PACIENTE ===\nNombre: ${patientContext.name} | Edad: ${patientContext.age} años | Género: ${genderLabel}${patientContext.weight ? ` | Peso: ${patientContext.weight} kg` : ''}${patientContext.height ? ` | Talla: ${patientContext.height} cm` : ''}${bmi ? ` | IMC: ${bmi}` : ''}\nIMPORTANTE: Personaliza el protocolo según la edad (${patientContext.age} años) y género (${genderLabel}) de este paciente. No hay historia clínica disponible.\n=== FIN DATOS ===`,
      })
    }
  }

  for (let i = 0; i < files.length; i++) {
    const { fileBase64, fileType, mimeType } = files[i]
    const label = files.length > 1 ? `Archivo ${i + 1} de ${files.length}` : 'Estudio de laboratorio'

    if (fileType === 'image') {
      if (files.length > 1) {
        userContent.push({ type: 'text', text: `--- ${label} (imagen) ---` })
      }
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: fileBase64,
        },
      })
    } else if (fileType === 'pdf') {
      const buffer = Buffer.from(fileBase64, 'base64')
      let pdfText: string
      try {
        const pdfData = await pdfParse(buffer)
        pdfText = pdfData.text
      } catch (e) {
        throw new Error(`No se pudo leer el archivo PDF ${i + 1}. Verifica que no esté protegido con contraseña o intenta con una imagen.`)
      }

      if (!pdfText || pdfText.trim().length < 10) {
        throw new Error(`No se pudo extraer texto del archivo ${i + 1}. Intenta con una imagen del estudio.`)
      }

      userContent.push({
        type: 'text',
        text: `--- ${label} (PDF) ---\n\n${pdfText}`,
      })
    }
  }

  userContent.push({
    type: 'text',
    text: USER_PROMPT,
  })

  let rawText = ''
  await client.messages
    .stream({
      model: MODEL,
      max_tokens: 64000,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })
    .on('text', (text) => {
      rawText += text
      onProgress?.()
    })
    .finalMessage()

  if (!rawText) {
    throw new Error(`Claude no devolvió respuesta. (${files.length} archivo${files.length > 1 ? 's' : ''} enviado${files.length > 1 ? 's' : ''})`)
  }

  const validated = validateAndParseAiResponse(rawText)

  if (!validated.parsedData) {
    throw new Error('Estructura JSON incompleta: falta parsedData')
  }

  return {
    parsedData: validated.parsedData,
    aiAnalysis: validated.aiAnalysis,
  }
}

// ─── Re-análisis usando parsedData ya extraído + historia clínica ─────────────

const REANALYZE_PROMPT = `TAREA: Re-genera el análisis médico de longevidad usando los biomarcadores ya extraídos y la historia clínica completa del paciente.

INSTRUCCIONES DE PERSONALIZACIÓN:
- Los biomarcadores (parsedData) ya están correctamente extraídos — úsalos como referencia fija
- Enriquece el análisis incorporando el contexto clínico completo: estilo de vida, historial familiar, medicamentos actuales, alergias, dieta, ejercicio, sueño, estrés
- El protocolo debe ser ÚNICO para este paciente:
  · NO repitas suplementos que el paciente ya toma (cítalos como fortaleza en el FODA)
  · NUNCA recomendar medicamentos a los que el paciente sea alérgico
  · Ajusta dosis según edad (<40 preventivas, 40-60 estándar, >60 terapéuticas con ajuste renal/hepático)
  · Ajusta según género (necesidades hormonales diferenciadas)
  · Si el paciente es joven y sano, enfócate en optimización y estilo de vida, no farmacología
  · Si el paciente es >60 o tiene múltiples hallazgos, incluye intervenciones más agresivas
  · Incluye SIEMPRE al menos 1 intervención de estilo de vida
- Ajusta los riesgos considerando el historial familiar (si hay diabetes familiar, aumenta probabilidad metabólica, etc.)
- La historia clínica puede explicar valores fuera de rango (ej: estrés alto → cortisol elevado, sedentarismo → glucosa límite)
- Cada "mechanism" debe citar el biomarcador ESPECÍFICO con su valor actual

Genera ÚNICAMENTE este JSON (sin markdown, sin texto adicional):

{
  "aiAnalysis": {
    "systemScores": { "cardiovascular": 0, "metabolic": 0, "hepatic": 0, "renal": 0, "immune": 0, "hematologic": 0, "inflammatory": 0, "vitamins": 0 },
    "overallScore": 0,
    "longevity_age": 0,
    "clinicalSummary": "",
    "keyAlerts": [{ "title": "", "description": "", "level": "warning", "value": "", "target": "" }],
    "swot": { "strengths": [], "weaknesses": [], "opportunities": [], "threats": [] },
    "risks": [{ "disease": "Nombre", "probability": 0, "horizon": "X años", "drivers": ["biomarcador: valor"], "color": "#hex" }],
    "protocol": [{ "number": 1, "category": "", "molecule": "", "dose": "", "mechanism": "", "evidence": "", "clinicalTrial": "", "targetBiomarkers": [], "expectedResult": "", "action": "", "urgency": "medium" }],
    "projectionData": [{ "year": 1, "withoutIntervention": 0, "withIntervention": 0, "yearRisk": { "biomarkers": [], "conditions": [], "urgencyNote": "" } }],
    "projectionFactors": [{ "factor": "", "currentValue": "", "optimalValue": "", "medicalJustification": "", "withoutProtocol": "", "withProtocol": "" }]
  }
}

REGLAS DE FORMATO: Scores: 85-100 óptimo, 65-84 normal, 40-64 atención, 0-39 crítico. FODA exactamente 4+3+4+3. OBLIGATORIO: "risks" exactamente 4 enfermedades con probability, horizon, drivers y color (cardiovascular=#ff4d6d, metabólico=#f5a623, hepático=#a78bfa, renal=#38bdf8). Protocol entre 8 y 12 intervenciones hiperpersonalizadas de al menos 4 categorías distintas (mínimo 1 estilo de vida, 1 regenerativa/péptido si aplica; mechanism/expectedResult/action = 1 oración con biomarcador específico y valor). projectionData exactamente 10 puntos (años 1-10). projectionFactors exactamente 3 factores (withoutProtocol/withProtocol = 1 oración). Todo en español mexicano, lenguaje conciso.`

export async function reanalyzeWithClinicalHistory(
  parsedData: object,
  patientContext: PatientContextForPrompt,
  onProgress?: () => void
): Promise<object> {
  let contextText: string
  if (patientContext.clinical_history) {
    contextText = formatClinicalHistory(patientContext)
  } else {
    const genderLabel = patientContext.gender === 'male' ? 'Masculino' : patientContext.gender === 'female' ? 'Femenino' : 'Otro'
    const bmi = patientContext.weight && patientContext.height
      ? (patientContext.weight / Math.pow(patientContext.height / 100, 2)).toFixed(1)
      : null
    contextText = `=== DATOS DEL PACIENTE ===\nNombre: ${patientContext.name} | Edad: ${patientContext.age} años | Género: ${genderLabel}${patientContext.weight ? ` | Peso: ${patientContext.weight} kg` : ''}${patientContext.height ? ` | Talla: ${patientContext.height} cm` : ''}${bmi ? ` | IMC: ${bmi}` : ''}\nNo hay historia clínica registrada. Personaliza el protocolo según edad (${patientContext.age}) y género (${genderLabel}).\n=== FIN DATOS ===`
  }

  const userContent: Anthropic.MessageParam['content'] = [
    { type: 'text', text: contextText },
    { type: 'text', text: `BIOMARCADORES DEL PACIENTE (extraídos del estudio de laboratorio):\n${JSON.stringify(parsedData, null, 2)}` },
    { type: 'text', text: REANALYZE_PROMPT },
  ]

  let rawText = ''
  await client.messages
    .stream({
      model: MODEL,
      max_tokens: 64000,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })
    .on('text', (text) => {
      rawText += text
      onProgress?.()
    })
    .finalMessage()

  if (!rawText) throw new Error('Claude no devolvió respuesta.')

  const validated = validateAndParseAiResponse(rawText)

  return validated.aiAnalysis
}

// ══════════════════════════════════════════════════════════════
// RE-ANÁLISIS PARCIAL (solo secciones que dependen de historia clínica)
// Cachea: systemScores, overallScore, longevity_age, keyAlerts, swot, risks
// Regenera: clinicalSummary, protocol, projectionData, projectionFactors
// ══════════════════════════════════════════════════════════════

const PARTIAL_REANALYZE_PROMPT = `Regenera SOLO clinicalSummary, protocol, projectionData y projectionFactors. Las demás secciones (systemScores, overallScore, longevity_age, keyAlerts, swot, risks) ya están calculadas y se mantienen.

PERSONALIZACIÓN CON HISTORIA CLÍNICA:
- Protocolo ÚNICO para este paciente, 8-12 intervenciones de ≥4 categorías
- NO duplicar suplementos/medicamentos que el paciente ya toma
- NUNCA recomendar medicamentos a los que sea alérgico ni sus derivados
- Verificar INTERACCIONES: Omega-3+Nattokinasa=sangrado, Metformina+Berberina=hipoglucemia, NAC+Nitroglicerina=hipotensión, K2+warfarina=contraindicado
- Verificar CONTRAINDICACIONES: GFR<45→excluir metformina/creatina; ALT>3x→excluir niacina; anticoagulación→excluir nattokinasa/K2; autoinmune→preferir inmunomoduladores
- Cada molécula UNA SOLA VEZ. Si tiene múltiples beneficios, combínalos en un solo "mechanism"
- Células madre: SOLO hUC-MSC cordón umbilical. NUNCA médula ósea ni tejido adiposo
- Dosis formato: "Xmg Nx/día". clinicalTrial: nombre ensayo o "Sin ensayo nombrado — evidencia: Autor, Revista, Año"
- Calcular projectionData con la LÓGICA PROPIETARIA de proyección del system prompt
- Urgencia: immediate=riesgo vital, high=danger sin riesgo vital, medium=warning, low=optimización

JSON (sin markdown):
{
  "clinicalSummary": "",
  "protocol": [{ "number": 1, "category": "", "molecule": "", "dose": "", "mechanism": "", "evidence": "", "clinicalTrial": "", "targetBiomarkers": [], "expectedResult": "", "action": "", "urgency": "medium" }],
  "projectionData": [{ "year": 1, "withoutIntervention": 0, "withIntervention": 0, "yearRisk": { "biomarkers": [], "conditions": [], "urgencyNote": "" } }],
  "projectionFactors": [{ "factor": "", "currentValue": "", "optimalValue": "", "medicalJustification": "", "withoutProtocol": "", "withProtocol": "" }]
}
projectionData: 10 puntos (años 1-10). projectionFactors: 3 factores. Español mexicano, técnico.`

export async function reanalyzePartial(
  parsedData: object,
  cachedAnalysis: object,
  patientContext: PatientContextForPrompt,
  onProgress?: () => void
): Promise<object> {
  let contextText: string
  if (patientContext.clinical_history) {
    contextText = formatClinicalHistory(patientContext)
  } else {
    const genderLabel = patientContext.gender === 'male' ? 'Masculino' : patientContext.gender === 'female' ? 'Femenino' : 'Otro'
    const bmi = patientContext.weight && patientContext.height
      ? (patientContext.weight / Math.pow(patientContext.height / 100, 2)).toFixed(1)
      : null
    contextText = `=== DATOS DEL PACIENTE ===\nNombre: ${patientContext.name} | Edad: ${patientContext.age} años | Género: ${genderLabel}${patientContext.weight ? ` | Peso: ${patientContext.weight} kg` : ''}${patientContext.height ? ` | Talla: ${patientContext.height} cm` : ''}${bmi ? ` | IMC: ${bmi}` : ''}\n=== FIN DATOS ===`
  }

  const userContent: Anthropic.MessageParam['content'] = [
    { type: 'text', text: contextText },
    { type: 'text', text: `BIOMARCADORES DEL PACIENTE:\n${JSON.stringify(parsedData, null, 2)}` },
    { type: 'text', text: PARTIAL_REANALYZE_PROMPT },
  ]

  let rawText = ''
  await client.messages
    .stream({
      model: MODEL,
      max_tokens: 24000,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })
    .on('text', (text) => {
      rawText += text
      onProgress?.()
    })
    .finalMessage()

  if (!rawText) throw new Error('Claude no devolvió respuesta parcial.')

  // Parse partial response
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No se encontró JSON en respuesta parcial.')

  let partial: Record<string, unknown>
  try {
    partial = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('JSON parcial inválido.')
  }

  // Merge: cached sections + new sections
  const cached = cachedAnalysis as Record<string, unknown>
  const protocol = ensureArray(partial.protocol || cached.protocol) as object[]
  deduplicateProtocol(protocol)

  const merged = {
    systemScores: cached.systemScores,
    overallScore: cached.overallScore,
    longevity_age: cached.longevity_age,
    keyAlerts: cached.keyAlerts,
    swot: cached.swot,
    risks: cached.risks,
    clinicalSummary: partial.clinicalSummary || cached.clinicalSummary,
    protocol,
    projectionData: partial.projectionData || cached.projectionData,
    projectionFactors: partial.projectionFactors || cached.projectionFactors,
  }

  return merged
}
