import Anthropic from '@anthropic-ai/sdk'
import { computeAllScores, type ParsedBiomarkers, type AllScoresResult } from '../longevity-scoring'
import { computePhenoAge } from '../longevity-phenoage'
import { computeFODA, computeFODASkeleton, type FODASkeleton, type FODAResult } from '../longevity-foda'
import { computeProjection } from '../longevity-projection'
import { analyzeWearables, applyWearableAdjustments, type WearableData } from '../longevity-wearables'
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

BIOMARCADORES URINARIOS Y EVIDENCIA CIENTÍFICA 2022-2026:
- Microalbuminuria/ACR: predictor de mortalidad CV y progresión renal. KDIGO 2024 Clinical Practice Guideline for CKD: ACR >30 mg/g = estadio A2, reclasifica riesgo incluso con GFR normal. Bakris GL, Kidney Int 2024: ACR reduce eventos renales -30% cuando se interviene tempranamente.
- Calciuria 24h: Ferraro PM et al., NEJM 2024 (Italian Kidney Stone Cohort): hipercalciuria >250 mg/24h = +3.2x riesgo de litiasis recurrente y correlación con pérdida de densidad mineral ósea -2.1% anual.
- Oxaluria 24h: Waikar SS et al., JASN 2022: hiperoxaluria >40 mg/24h como factor independiente de nefropatía por oxalato. Nuevos umbrales de riesgo validados en cohorte de 12,000 pacientes.
- Citraturia 24h: Zisman AL et al., Kidney360 2023: hipocitraturia <320 mg/24h + pH <5.5 = riesgo compuesto de litiasis ×4.5. Suplementación con citrato de potasio reduce recurrencia -75%.
- Cortisol libre urinario 24h: Fleseriu M et al., Lancet Diabetes & Endocrinology 2023: nueva validación del cortisol urinario como gold standard para Cushing, con LC-MS/MS como método preferido (sensibilidad 95%).
- Cadmio urinario: Satarug S et al., Environ Health Perspectives 2022: cadmio >1 µg/L = nefrotoxicidad tubular subclínica en población general (cohorte NHANES 2015-2020, n=15,000). Reducción de GFR -3.2 mL/min por cada µg/L de cadmio.
- Mercurio urinario: Genchi G et al., Int J Environ Res Public Health 2022: mercurio >15 µg/L asociado a neurotoxicidad subclínica (deterioro cognitivo -12% en scores neuropsicológicos).
- Plomo urinario: Lanphear BP et al., Lancet Public Health 2023: plomo urinario >20 µg/L = +15% mortalidad CV en meta-análisis de 350,000 participantes. No existe nivel seguro.
- Arsénico urinario: Moon KA et al., BMJ 2022: arsénico >35 µg/L asociado a +40% incidencia de DM2 y enfermedad CV en comunidades expuestas.
- Proteinuria 24h: KDIGO 2024: >150 mg/24h = daño glomerular; >1g/24h = progresión acelerada. EMPA-KIDNEY (Herrington WG, NEJM 2023): SGLT2i reduce proteinuria -30%.
- Catecolaminas/metanefrinas urinarias: Endocrine Society 2023 Clinical Practice Guideline: metanefrinas fraccionadas urinarias como screening de primera línea para feocromocitoma (sensibilidad 97%).
- Porfirinas urinarias: Bissell DM et al., NEJM 2023: givosiran (siRNA) redujo ataques de porfiria aguda -74% y porfobilinógeno urinario -75% (ENVISION Phase 3).
- 5-HIAA: Halperin DM et al., J Clin Oncology 2023: 5-HIAA urinario >15 mg/24h con sensibilidad 90% para tumores neuroendocrinos. LC-MS/MS reemplaza métodos colorimétricos.
- pH urinario: Siener R et al., Urolithiasis 2022: pH <5.5 sostenido = +5x riesgo de litiasis por ácido úrico. Alcalinización con citrato de potasio normaliza pH y disuelve cálculos existentes.

Cuando hay biomarcadores urinarios disponibles, úsalos para:
1. Ajustar el score RENAL: ACR/microalbuminuria detecta daño 5-10 años antes que creatinina sérica
2. Ajustar FODA: hipercalciuria como amenaza de osteoporosis, metales pesados como toxicidad
3. Personalizar protocolo: quelantes si metales pesados elevados, citrato si hipocitraturia, nefroprotección si ACR elevado

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
NOTA: systemScores, overallScore, longevity_age, projectionData y projectionFactors
se calculan por el MOTOR MATEMÁTICO (funciones sigmoideas, PhenoAge, Gompertz).
NO los calcules — el código los sobreescribirá. Genera valores placeholder (0).
══════════════════════════════════════════════════════════════

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

RANGOS ÓPTIMOS URINARIOS (si hay datos de orina en el documento):
pH: 5.5-7.0 | Densidad: 1.005-1.030 | Microalbúmina: <20 mg/L | ACR: <30 mg/g
Calciuria 24h: <250 mg M / <300 mg H | Oxaluria: <40 mg/24h | Citraturia: >320 mg/24h
Cortisol libre 24h: 10-100 µg/24h | Proteinuria 24h: <150 mg/24h
Cadmio: <2 µg/L | Mercurio: <20 µg/L | Plomo: <25 µg/L | Arsénico: <50 µg/L
Eritrocitos orina: <3/campo | Leucocitos orina: <5/campo

Genera clinicalSummary, keyAlerts, FODA, risks y protocol. Los campos systemScores, overallScore, longevity_age, projectionData y projectionFactors se calculan por el motor matemático — genera valores placeholder (0).

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
Péptidos terapéuticos (evidencia 2018-2025):
- BPC-157: 250-500mcg 2x/día SC/oral. Reparación tisular vía VEGF, gastroprotección, anti-NF-κB (Sikiric, Biomedicines 2024; Chang, Molecules 2022)
- Tesamorelina: 2mg/día SC. GHRH análogo aprobado FDA, reduce grasa visceral -18% y hepática -37% (Stanley, NEJM 2025; Falutz, NEJM 2007)
- TB-500 (Timosina Beta-4): 2.5-5mg 2x/sem SC. Regeneración cardíaca, anti-NF-κB (Smart, Nature 2011; Dunn, Cornea 2024)
- GHK-Cu: 1-2mg/día SC. Revierte 54% genes de envejecimiento, +70% colágeno I, neuroprotección (Pickart, BioMed Research International 2015; Neural Regeneration Research 2023)
- Tirzepatida: 2.5→15mg/sem SC. GIP/GLP-1 dual, peso -20.2% (SURMOUNT-5 NEJM 2025), HbA1c -2.0% (SURPASS), NASH resolución 52% (Nature Medicine 2024)
- Semaglutida: 0.25→2.4mg/sem SC. GLP-1, MACE -20% (SELECT NEJM 2023), nefroprotección -24% (FLOW NEJM 2024), peso -14.9% (STEP 1)
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
    "inflammation": { "crp": null, "homocysteine": null },
    "urinalysis": { "ph": null, "specificGravity": null, "protein": null, "glucose": null, "ketones": null, "blood": null, "leukocyteEsterase": null, "nitrites": null, "bilirubin": null, "urobilinogen": null, "microalbumin": null, "acr": null, "creatinineUrine": null, "rbc": null, "wbc": null, "casts": null, "crystals": null, "bacteria": null, "uricAcid24h": null, "calcium24h": null, "oxalate24h": null, "citrate24h": null, "protein24h": null, "cortisol24h": null, "mercury": null, "lead": null, "cadmium": null, "arsenic": null, "catecholamines": null, "metanephrines": null, "porphyrins": null, "hydroxyindoleaceticAcid": null }
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

// ─── FODA Híbrido: Motor selecciona, Claude redacta ──────────────────────────

const FODA_ENRICH_PROMPT = `Eres el narrador clínico de Longevity IA. El motor matemático ya seleccionó los biomarcadores del FODA y su orden de prioridad. Tu trabajo es REDACTAR el detalle narrativo de cada punto, personalizado con la historia clínica del paciente.

REGLAS:
- NO cambies los biomarcadores seleccionados, NO cambies el orden, NO agregues ni quites puntos
- Personaliza cada "detail" incorporando contexto del paciente: edad, ejercicio, dieta, antecedentes, medicamentos, sueño, estrés
- Cada "detail" debe ser 1-2 oraciones: mecanismo fisiopatológico + contexto clínico del paciente
- Cada "evidence" debe citar autor, revista, año y magnitud del efecto cuantificado
- expectedImpact (fortalezas y oportunidades): dato cuantificado de beneficio
- probability (debilidades y amenazas): "Alta", "Media" o "Baja" — ya viene precalculada, ajústala solo si la historia clínica lo justifica claramente
- Español mexicano, lenguaje técnico y preciso
- Responde ÚNICAMENTE con JSON válido, sin markdown`

/**
 * FODA Híbrido: el motor selecciona biomarcadores (determinista),
 * Claude redacta el detalle narrativo (contextualizado).
 *
 * Si la llamada a Claude falla, retorna el FODA estático como fallback.
 */
async function enrichFODANarrative(
  skeleton: FODASkeleton,
  patientContext: PatientContextForPrompt | null,
  computed: AllScoresResult,
  patientAge: number,
): Promise<FODAResult> {
  // Fallback estático (el FODA del motor puro)
  const staticFoda = computeFODA(computed, patientAge)

  // Si no hay historia clínica, no vale la pena llamar a Claude
  if (!patientContext?.clinical_history) return staticFoda

  // Si el skeleton no tiene suficientes items para enriquecer, usar estático
  const totalItems = skeleton.strengths.length + skeleton.weaknesses.length +
    skeleton.opportunities.length + skeleton.threats.length
  if (totalItems < 4) return staticFoda

  try {
    const contextText = formatClinicalHistory(patientContext)

    const skeletonJson = JSON.stringify({
      strengths: skeleton.strengths.map(s => ({
        biomarker: s.biomarkerName,
        value: s.value,
        unit: s.unit,
        score: s.score,
        templateLabel: s.templateLabel,
        templateDetail: s.templateDetail,
        templateEvidence: s.templateEvidence,
        templateImpact: s.templateImpactOrProbability,
      })),
      weaknesses: skeleton.weaknesses.map(s => ({
        biomarker: s.biomarkerName,
        value: s.value,
        unit: s.unit,
        score: s.score,
        templateLabel: s.templateLabel,
        templateDetail: s.templateDetail,
        templateEvidence: s.templateEvidence,
        templateProbability: s.templateImpactOrProbability,
      })),
      opportunities: skeleton.opportunities.map(s => ({
        biomarker: s.biomarkerName,
        value: s.value,
        unit: s.unit,
        score: s.score,
        templateLabel: s.templateLabel,
        templateDetail: s.templateDetail,
        templateEvidence: s.templateEvidence,
        templateImpact: s.templateImpactOrProbability,
      })),
      threats: skeleton.threats.map(s => ({
        biomarker: s.biomarkerName,
        value: s.value,
        unit: s.unit,
        score: s.score,
        templateLabel: s.templateLabel,
        templateDetail: s.templateDetail,
        templateEvidence: s.templateEvidence,
        templateProbability: s.templateImpactOrProbability,
      })),
    }, null, 2)

    const userMsg = `${contextText}

SKELETON FODA (selección determinista del motor matemático — NO cambiar biomarcadores ni orden):
${skeletonJson}

Genera el FODA enriquecido con narrativa personalizada. JSON exacto:
{
  "strengths": [{ "label": "", "detail": "", "evidence": "", "expectedImpact": "" }],
  "weaknesses": [{ "label": "", "detail": "", "evidence": "", "probability": "Alta|Media|Baja" }],
  "opportunities": [{ "label": "", "detail": "", "evidence": "", "expectedImpact": "" }],
  "threats": [{ "label": "", "detail": "", "evidence": "", "probability": "Alta|Media|Baja" }]
}`

    let rawText = ''
    await client.messages
      .stream({
        model: MODEL,
        max_tokens: 4000,
        temperature: 0,
        system: FODA_ENRICH_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
      })
      .on('text', (text) => { rawText += text })
      .finalMessage()

    if (!rawText) return staticFoda

    const firstBrace = rawText.indexOf('{')
    const lastBrace = rawText.lastIndexOf('}')
    if (firstBrace === -1 || lastBrace === -1) return staticFoda

    const parsed = JSON.parse(rawText.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>

    // Merge: narrativa de Claude + metadata del motor
    const enriched: FODAResult = {
      strengths: mergeNarrativeWithSkeleton(parsed.strengths, skeleton.strengths, 'strength', staticFoda.strengths),
      weaknesses: mergeNarrativeWithSkeleton(parsed.weaknesses, skeleton.weaknesses, 'weakness', staticFoda.weaknesses),
      opportunities: mergeNarrativeWithSkeleton(parsed.opportunities, skeleton.opportunities, 'opportunity', staticFoda.opportunities),
      threats: mergeNarrativeWithSkeleton(parsed.threats, skeleton.threats, 'threat', staticFoda.threats),
    }

    return enriched
  } catch (e) {
    console.warn('FODA híbrido: Claude falló, usando FODA estático:', e)
    return staticFoda
  }
}

/** Combina la narrativa de Claude con los datos numéricos del motor */
function mergeNarrativeWithSkeleton(
  claudeItems: unknown,
  skeletonItems: FODASkeleton['strengths'],
  category: string,
  fallbackItems: FODAResult['strengths'],
): FODAResult['strengths'] {
  const claudeArr = Array.isArray(claudeItems) ? claudeItems : []

  return skeletonItems.map((skel, i) => {
    const claude = (claudeArr[i] && typeof claudeArr[i] === 'object') ? claudeArr[i] as Record<string, unknown> : null
    const fallback = fallbackItems[i]

    if (!claude) return fallback

    const item: FODAResult['strengths'][0] = {
      label: ensureString(claude.label, skel.templateLabel),
      detail: ensureString(claude.detail, skel.templateDetail),
      evidence: ensureString(claude.evidence, skel.templateEvidence),
      biomarker: skel.biomarkerName,
      value: skel.value,
      score: skel.score,
    }

    if (category === 'strength' || category === 'opportunity') {
      item.expectedImpact = ensureString(claude.expectedImpact, skel.templateImpactOrProbability)
    }
    if (category === 'weakness' || category === 'threat') {
      item.probability = ensureString(claude.probability, skel.templateImpactOrProbability)
    }

    return item
  })
}

// ─── Validación compartida del JSON de respuesta ──────────────────────────────

function validateAndParseAiResponse(rawText: string, patientAge?: number, patientGender?: string, wearableData?: WearableData | null): { parsedData?: object; aiAnalysis: object } {
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
      urinalysis: validateParsedDataSection(pd.urinalysis),
    }
  }

  // ══════════════════════════════════════════════════════════════
  // OVERRIDE MATEMÁTICO: Recalcular scores, edad, FODA y proyección
  // con funciones deterministas (sigmoide, PhenoAge, Gompertz)
  // Claude provee: clinicalSummary, keyAlerts, risks, protocol (narrativa)
  // Código computa: systemScores, overallScore, longevity_age, swot, projectionData/Factors
  // ══════════════════════════════════════════════════════════════

  if (validatedParsedData) {
    try {
      const pd = validatedParsedData as ParsedBiomarkers
      // Usar edad y género del paciente (pasados como parámetro o defaults)
      const pAge = patientAge ?? 40
      const pGender = patientGender ?? 'male'

      // 1. Scores matemáticos con funciones sigmoideas
      const computed = computeAllScores(pd, pGender)
      if (Object.keys(computed.systemScores).length > 0) {
        aiAnalysis.systemScores = computed.systemScores
        aiAnalysis.overallScore = computed.overallScore
      }

      // 2. Edad biológica con PhenoAge + modificadores
      const phenoAge = computePhenoAge(pd, pAge, pGender)
      if (phenoAge.biologicalAge > 0) {
        aiAnalysis.longevity_age = phenoAge.biologicalAge
      }

      // 3. FODA computada
      const foda = computeFODA(computed, pAge)
      aiAnalysis.swot = foda

      // 4. Proyección Gompertz
      const projection = computeProjection(computed, pAge)
      aiAnalysis.projectionData = projection.projectionData
      aiAnalysis.projectionFactors = projection.projectionFactors

      // 5. Integración de wearables (si hay datos disponibles)
      const wearableAnalysis = analyzeWearables(wearableData)
      if (wearableAnalysis.hasData) {
        const adjusted = applyWearableAdjustments(
          aiAnalysis.systemScores as Record<string, number>,
          aiAnalysis.overallScore as number,
          aiAnalysis.longevity_age as number,
          wearableAnalysis
        )
        aiAnalysis.systemScores = adjusted.systemScores
        aiAnalysis.overallScore = adjusted.overallScore
        aiAnalysis.longevity_age = adjusted.biologicalAge
        // Adjuntar datos de wearables al análisis para que el frontend pueda mostrarlos
        ;(aiAnalysis as Record<string, unknown>)._wearables = {
          adjustments: wearableAnalysis.adjustments,
          alerts: wearableAnalysis.alerts,
          summary: wearableAnalysis.summary,
          overallAdjustment: wearableAnalysis.overallAdjustment,
          biologicalAgeAdjustment: wearableAnalysis.biologicalAgeAdjustment,
        }
      }

    } catch (e) {
      // Si falla el cálculo matemático, mantener los valores de Claude como fallback
      console.warn('Override matemático falló, usando valores de Claude:', e)
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

Si el documento incluye ANÁLISIS DE ORINA, extrae también con rangos óptimos:
- pH urinario: óptimo 5.5-7.0
- Microalbúmina: óptimo <20 mg/L
- ACR (albúmina/creatinina): óptimo <30 mg/g
- Proteinuria 24h: óptimo <150 mg/24h
- Calciuria 24h: óptimo <250 mg/24h (mujeres), <300 mg/24h (hombres)
- Oxaluria 24h: óptimo <40 mg/24h
- Citraturia 24h: óptimo >320 mg/24h
- Cortisol libre urinario 24h: óptimo 10-100 µg/24h
- Metales pesados: Cadmio <2 µg/L, Mercurio <20 µg/L, Plomo <25 µg/L, Arsénico <50 µg/L

Genera ÚNICAMENTE este JSON, sin texto adicional:

{
  "parsedData": {
    "hematology": { "rbc": null, "hemoglobin": null, "hematocrit": null, "mcv": null, "mch": null, "mchc": null, "rdw": null, "wbc": null, "neutrophils": null, "lymphocytes": null, "monocytes": null, "eosinophils": null, "platelets": null, "mpv": null },
    "metabolic": { "glucose": null, "urea": null, "bun": null, "creatinine": null, "gfr": null, "uricAcid": null },
    "lipids": { "totalCholesterol": null, "triglycerides": null, "hdl": null, "ldl": null, "vldl": null, "nonHdl": null, "atherogenicIndex": null, "ldlHdlRatio": null, "tgHdlRatio": null },
    "liver": { "alkalinePhosphatase": null, "ast": null, "alt": null, "ggt": null, "ldh": null, "totalProtein": null, "albumin": null, "globulin": null, "amylase": null, "totalBilirubin": null },
    "vitamins": { "vitaminD": null, "vitaminB12": null, "ferritin": null },
    "hormones": { "tsh": null, "testosterone": null, "cortisol": null, "insulin": null, "hba1c": null },
    "inflammation": { "crp": null, "homocysteine": null },
    "urinalysis": { "ph": null, "specificGravity": null, "protein": null, "glucose": null, "ketones": null, "blood": null, "leukocyteEsterase": null, "nitrites": null, "bilirubin": null, "urobilinogen": null, "microalbumin": null, "acr": null, "creatinineUrine": null, "rbc": null, "wbc": null, "casts": null, "crystals": null, "bacteria": null, "uricAcid24h": null, "calcium24h": null, "oxalate24h": null, "citrate24h": null, "protein24h": null, "cortisol24h": null, "mercury": null, "lead": null, "cadmium": null, "arsenic": null, "catecholamines": null, "metanephrines": null, "porphyrins": null, "hydroxyindoleaceticAcid": null }
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
      max_tokens: 16000,  // 164 biomarcadores (sangre + orina) necesitan espacio
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
      max_tokens: 32000,  // parsedData (164 biomarcadores) + aiAnalysis necesitan más espacio
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

  const validated = validateAndParseAiResponse(
    rawText,
    patientContext?.age,
    patientContext?.gender
  )

  if (!validated.parsedData) {
    throw new Error('Estructura JSON incompleta: falta parsedData')
  }

  // ── FODA Híbrido: enriquecer con narrativa de Claude si hay historia clínica ──
  if (patientContext?.clinical_history && validated.parsedData) {
    try {
      const pd = validated.parsedData as ParsedBiomarkers
      const pAge = patientContext.age ?? 40
      const computed = computeAllScores(pd, patientContext.gender ?? 'male')
      if (Object.keys(computed.systemScores).length > 0) {
        const skeleton = computeFODASkeleton(computed, pAge)
        const enrichedFoda = await enrichFODANarrative(skeleton, patientContext, computed, pAge)
        ;(validated.aiAnalysis as Record<string, unknown>).swot = enrichedFoda
      }
    } catch (e) {
      console.warn('FODA híbrido en analyzeLabFiles falló, usando FODA estático:', e)
    }
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

REGLAS DE FORMATO: systemScores, overallScore, longevity_age, projectionData y projectionFactors = PLACEHOLDER (0/vacío), el motor matemático los calcula. FODA exactamente 4+3+4+3. OBLIGATORIO: "risks" exactamente 4 enfermedades con probability, horizon, drivers y color (cardiovascular=#ff4d6d, metabólico=#f5a623, hepático=#a78bfa, renal=#38bdf8). Protocol entre 8 y 12 intervenciones hiperpersonalizadas de al menos 4 categorías distintas (mínimo 1 estilo de vida, 1 regenerativa/péptido si aplica; mechanism/expectedResult/action = 1 oración con biomarcador específico y valor). Todo en español mexicano, lenguaje conciso.`

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
      max_tokens: 16000,
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

  const validated = validateAndParseAiResponse(rawText, patientContext.age, patientContext.gender)
  const ai = validated.aiAnalysis as Record<string, unknown>

  // ══ OVERRIDE MATEMÁTICO (el parsedData viene como parámetro, no de Claude) ══
  try {
    const pd = parsedData as ParsedBiomarkers
    const pAge = patientContext.age ?? 40
    const pGender = patientContext.gender ?? 'male'

    // 1. Scores sigmoideos
    const computed = computeAllScores(pd, pGender)
    if (Object.keys(computed.systemScores).length > 0) {
      ai.systemScores = computed.systemScores
      ai.overallScore = computed.overallScore
    }

    // 2. Edad biológica PhenoAge
    const phenoAge = computePhenoAge(pd, pAge, pGender)
    if (phenoAge.biologicalAge > 0) {
      ai.longevity_age = phenoAge.biologicalAge
    }

    // 3. FODA híbrida
    if (patientContext.clinical_history && Object.keys(computed.systemScores).length > 0) {
      const skeleton = computeFODASkeleton(computed, pAge)
      const enrichedFoda = await enrichFODANarrative(skeleton, patientContext, computed, pAge)
      ai.swot = enrichedFoda
    } else {
      ai.swot = computeFODA(computed, pAge)
    }

    // 4. Proyección Gompertz
    const projection = computeProjection(computed, pAge)
    ai.projectionData = projection.projectionData
    ai.projectionFactors = projection.projectionFactors

    // 5. Wearables (si hay datos)
    const wearableAnalysis = analyzeWearables(null)
    if (wearableAnalysis.hasData) {
      const adjusted = applyWearableAdjustments(
        ai.systemScores as Record<string, number>,
        ai.overallScore as number,
        ai.longevity_age as number,
        wearableAnalysis
      )
      ai.systemScores = adjusted.systemScores
      ai.overallScore = adjusted.overallScore
      ai.longevity_age = adjusted.biologicalAge
    }
  } catch (e) {
    console.warn('Override matemático en reanalyzeWithClinicalHistory falló:', e)
  }

  return ai
}

// ══════════════════════════════════════════════════════════════
// RE-ANÁLISIS PARCIAL (solo secciones que dependen de historia clínica)
// Cachea: systemScores, overallScore, longevity_age, keyAlerts, swot, risks
// Regenera: clinicalSummary, protocol, projectionData, projectionFactors
// ══════════════════════════════════════════════════════════════

const PARTIAL_REANALYZE_PROMPT = `Regenera SOLO clinicalSummary y protocol. Los demás campos (systemScores, overallScore, longevity_age, keyAlerts, swot, risks, projectionData, projectionFactors) se calculan por el motor matemático.

PERSONALIZACIÓN CON HISTORIA CLÍNICA:
- Protocolo ÚNICO para este paciente, 8-12 intervenciones de ≥4 categorías
- NO duplicar suplementos/medicamentos que el paciente ya toma
- NUNCA recomendar medicamentos a los que sea alérgico ni sus derivados
- Verificar INTERACCIONES: Omega-3+Nattokinasa=sangrado, Metformina+Berberina=hipoglucemia, NAC+Nitroglicerina=hipotensión, K2+warfarina=contraindicado
- Verificar CONTRAINDICACIONES: GFR<45→excluir metformina/creatina; ALT>3x→excluir niacina; anticoagulación→excluir nattokinasa/K2; autoinmune→preferir inmunomoduladores
- Cada molécula UNA SOLA VEZ. Si tiene múltiples beneficios, combínalos en un solo "mechanism"
- Células madre: SOLO hUC-MSC cordón umbilical. NUNCA médula ósea ni tejido adiposo
- Dosis formato: "Xmg Nx/día". clinicalTrial: nombre ensayo o "Sin ensayo nombrado — evidencia: Autor, Revista, Año"
- Urgencia: immediate=riesgo vital, high=danger sin riesgo vital, medium=warning, low=optimización

JSON (sin markdown):
{
  "clinicalSummary": "",
  "protocol": [{ "number": 1, "category": "", "molecule": "", "dose": "", "mechanism": "", "evidence": "", "clinicalTrial": "", "targetBiomarkers": [], "expectedResult": "", "action": "", "urgency": "medium" }]
}
Español mexicano, técnico y conciso.`

export async function reanalyzePartial(
  parsedData: object,
  cachedAnalysis: object,
  patientContext: PatientContextForPrompt,
  onProgress?: () => void,
  wearableData?: WearableData | null
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
      max_tokens: 12000,
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

  // Recalcular scores, edad, FODA y proyección con funciones matemáticas
  const pd = parsedData as ParsedBiomarkers
  const computed = computeAllScores(pd, patientContext.gender)
  const phenoAge = computePhenoAge(pd, patientContext.age, patientContext.gender)
  const projection = computeProjection(computed, patientContext.age)

  let sysScores = Object.keys(computed.systemScores).length > 0 ? computed.systemScores : cached.systemScores as Record<string, number>
  let overall = Object.keys(computed.systemScores).length > 0 ? computed.overallScore : cached.overallScore as number
  let bioAge = phenoAge.biologicalAge > 0 ? phenoAge.biologicalAge : cached.longevity_age as number

  // FODA Híbrido: motor selecciona, Claude redacta (con fallback estático)
  let foda: FODAResult
  if (Object.keys(computed.systemScores).length > 0 && patientContext.clinical_history) {
    const skeleton = computeFODASkeleton(computed, patientContext.age)
    foda = await enrichFODANarrative(skeleton, patientContext, computed, patientContext.age)
  } else {
    foda = computeFODA(computed, patientContext.age)
  }

  // Integración de wearables (si hay datos disponibles)
  const wearableAnalysis = analyzeWearables(wearableData)
  let wearableMeta: object | undefined
  if (wearableAnalysis.hasData) {
    const adjusted = applyWearableAdjustments(sysScores, overall, bioAge, wearableAnalysis)
    sysScores = adjusted.systemScores
    overall = adjusted.overallScore
    bioAge = adjusted.biologicalAge
    wearableMeta = {
      adjustments: wearableAnalysis.adjustments,
      alerts: wearableAnalysis.alerts,
      summary: wearableAnalysis.summary,
      overallAdjustment: wearableAnalysis.overallAdjustment,
      biologicalAgeAdjustment: wearableAnalysis.biologicalAgeAdjustment,
    }
  }

  const merged: Record<string, unknown> = {
    systemScores: sysScores,
    overallScore: overall,
    longevity_age: bioAge,
    keyAlerts: cached.keyAlerts,
    swot: foda,
    risks: cached.risks,
    clinicalSummary: partial.clinicalSummary || cached.clinicalSummary,
    protocol,
    projectionData: projection.projectionData,
    projectionFactors: projection.projectionFactors,
  }

  if (wearableMeta) merged._wearables = wearableMeta

  return merged
}
