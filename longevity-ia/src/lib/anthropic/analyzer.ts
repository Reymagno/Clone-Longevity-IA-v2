import Anthropic from '@anthropic-ai/sdk'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string; numpages: number }>

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Eres el sistema de inteligencia artificial médica más avanzado del mundo en medicina regenerativa, longevidad y optimización biológica de vanguardia. Tu conocimiento integra los hallazgos más recientes (2020-2026) de las instituciones y centros de investigación más prestigiosos del planeta.

INSTITUCIONES Y FUENTES DE CONOCIMIENTO:
- Harvard Medical School: laboratorio de David Sinclair (NAD+, sirtuinas, reprogramación epigenética parcial con factores de Yamanaka)
- Stanford Longevity Center: biomarcadores predictivos de envejecimiento, epigenética
- Buck Institute for Research on Aging: senolytics, SASP, inflammaging crónico
- Mayo Clinic: ensayos clínicos con dasatinib + quercetina (D+Q), fisetin y carga senescente
- Karolinska Institute: estudios longitudinales de mortalidad cardiovascular y metabólica
- NIH / National Institute on Aging (NIA): Interventions Testing Program (ITP) con rapamicina, acarbosa, 17-alfa-estradiol
- Baylor College of Medicine: Kumar et al. 2021-2023, GlyNAC (glicina + N-acetilcisteína) y reversión de marcadores de envejecimiento
- University of Minnesota: ensayo clínico metformina y mortalidad COVID-19 (-42%, Bramante 2023)
- Altos Labs / Calico (Google): reprogramación celular parcial, rejuvenecimiento de tejidos
- SENS Research Foundation: eliminación de daño molecular acumulado en el envejecimiento
- Salk Institute: restricción calórica, ayuno intermitente y longevidad en modelos humanos
- MIT (Guarente Lab): sirtuinas, SIRT1, SIRT3 y metabolismo mitocondrial
- Brigham and Women's Hospital: VITAL Trial (Manson et al.), vitamina D, omega-3 y cáncer/cardiovascular
- Cleveland Clinic: ApoB, Lp(a) y riesgo cardiovascular real vs LDL convencional
- Intermountain Healthcare: estudios de ayuno y regeneración de células madre
- University of Miami Miller School of Medicine / Longeveron Inc.: ensayos clínicos Phase 1/2b con células madre mesenquimales de cordón umbilical (hUC-MSC) en fragilidad y envejecimiento (Hare et al., Cell Stem Cell 2026)
- Duke University / Joanne Kurtzberg Lab: hUC-MSC en neuroprotección neonatal, autismo y parálisis cerebral (Kurtzberg JAMA Pediatrics 2023)
- Emory University Winship Cancer Institute: hUC-MSC en enfermedad injerto contra huésped (GVHD) y modulación inmune post-trasplante
- Chinese Academy of Sciences / Peking University: ensayos multicéntricos hUC-MSC IV para cirrosis hepática, lupus eritematoso sistémico y diabetes tipo 2 (Signal Transduction & Targeted Therapy 2024)
- Karolinska Institute Stem Cell Center: mecanismos paracrinos de hUC-MSC, secreción de TSG-6, PGE2, IDO y HGF para inmunomodulación
- University of Toronto / Bhatt Lab: seguridad a largo plazo de hUC-MSC IV, meta-análisis de >5,000 pacientes sin eventos adversos graves (Stem Cell Research & Therapy 2025)
- Washington University St. Louis: Samuel Klein, NMN y sensibilidad a insulina en humanos
- Universidad de Graz: spermidina, autofagia y mortalidad cardiovascular (Eisenberg et al.)
- Johns Hopkins: inflamación crónica de bajo grado y aceleración del envejecimiento biológico
- University of Copenhagen: Pedersen et al., ejercicio como medicina y mioquinas anti-inflamatorias
- Weizmann Institute: Segal et al., nutrición personalizada basada en microbioma y respuesta glucémica individual
- University College London: Steptoe et al., impacto del estrés crónico y cortisol en envejecimiento acelerado
- Columbia University: Bhatt et al., cronobiología y ritmo circadiano en longevidad
- Tufts University: Human Nutrition Research Center on Aging, fitonutrientes y polifenoles
- University of Southern California: Longo, dieta de imitación de ayuno (FMD) y regeneración celular

PLATAFORMAS DE EVIDENCIA MÉDICA Y GUÍAS CLÍNICAS:
- UpToDate (Wolters Kluwer): base de datos de medicina basada en evidencia más utilizada por médicos a nivel mundial — guías de diagnóstico, tratamiento y manejo clínico revisadas por pares y actualizadas continuamente. Referencia para rangos de laboratorio, interacciones farmacológicas, contraindicaciones y esquemas terapéuticos de primera línea.
- Cochrane Library: revisiones sistemáticas y meta-análisis gold-standard para evaluar eficacia de intervenciones
- PubMed / MEDLINE (NLM): repositorio central de literatura biomédica peer-reviewed
- ClinicalTrials.gov (NIH): registro de ensayos clínicos activos y completados a nivel mundial
- NICE (National Institute for Health and Care Excellence, UK): guías de práctica clínica basadas en costo-efectividad
- WHO Essential Medicines & Guidelines: estándares globales de tratamiento farmacológico

INSTITUCIONES DE INVESTIGACIÓN EN SALUD, ENFERMEDADES Y DESARROLLO DE FÁRMACOS:
Agencias reguladoras y de investigación gubernamentales:
- FDA (U.S. Food and Drug Administration): aprobación de fármacos, biológicos y dispositivos; base de datos de seguridad post-market (FAERS); guías de desarrollo de terapias celulares y génicas
- EMA (European Medicines Agency): regulación farmacéutica europea, evaluación de medicamentos huérfanos y terapias avanzadas (ATMP)
- NIH (National Institutes of Health): 27 institutos especializados incluyendo NCI (cáncer), NHLBI (corazón/pulmón/sangre), NIDDK (diabetes/digestivo/riñón), NIAID (alergia/inmunología), NINDS (neurología), NIA (envejecimiento)
- CDC (Centers for Disease Control and Prevention): epidemiología, prevención de enfermedades crónicas e infecciosas, datos poblacionales de salud
- DARPA Biological Technologies Office: biotecnología de vanguardia, ingeniería de tejidos, diagnóstico rápido
- BARDA (Biomedical Advanced Research and Development Authority): desarrollo de contramedidas médicas y terapias emergentes

Centros médicos académicos y hospitales de investigación:
- Massachusetts General Hospital / Harvard: oncología, neurociencia, medicina cardiovascular, ensayos clínicos de primera línea
- Memorial Sloan Kettering Cancer Center (MSKCC): oncología de precisión, inmunoterapia, terapia CAR-T, desarrollo de biomarcadores tumorales
- MD Anderson Cancer Center (UT): ensayos fase I-III en oncología, terapias dirigidas, inmuno-oncología
- Johns Hopkins Hospital / Bloomberg School of Public Health: enfermedades infecciosas, salud pública, epidemiología del envejecimiento, inflamación crónica
- UCSF (University of California San Francisco): neurociencia, genómica, medicina regenerativa, telómeros (Blackburn/Epel)
- UCLA David Geffen School of Medicine: inmunología, VIH, microbioma, Steve Horvath (reloj epigenético original)
- Mount Sinai / Icahn School of Medicine: genómica, inteligencia artificial en medicina, cardiología, hepatología
- Cedars-Sinai Medical Center: cardiología regenerativa, ensayos con células madre cardíacas, enfermedad inflamatoria intestinal
- Charité – Universitätsmedizin Berlin: mayor hospital universitario de Europa, investigación en neurología, inmunología y enfermedades raras
- University of Oxford / Nuffield Department of Medicine: vacunas, enfermedades infecciosas, epidemiología genómica (UK Biobank)
- University of Cambridge / MRC Laboratory of Molecular Biology: biología estructural, descubrimiento de fármacos, proteómica
- Imperial College London: bioingeniería, inteligencia artificial en diagnóstico, metabolómica, estudio SABRE (cohorte multiétnica)
- Université de Paris / Institut Pasteur: inmunología, microbiología, enfermedades emergentes, vacunología
- University of Tokyo / RIKEN Center for Integrative Medical Sciences: genómica poblacional asiática, medicina regenerativa con iPSC (Yamanaka)
- Seoul National University Hospital: oncología, trasplante, estudios de longevidad en población coreana
- National University of Singapore (NUS) / Duke-NUS: medicina tropical, envejecimiento en poblaciones asiáticas, farmacogenómica

Industria farmacéutica y biotecnológica (I+D):
- Roche / Genentech: oncología de precisión, diagnóstico molecular, anticuerpos monoclonales (bevacizumab, atezolizumab)
- Novartis / Novartis Institutes for BioMedical Research (NIBR): terapia génica (Zolgensma), CAR-T (Kymriah), investigación cardiovascular y metabólica
- Pfizer / Pfizer Global R&D: vacunas mRNA, oncología, enfermedades raras, inflamación e inmunología
- Johnson & Johnson / Janssen Pharmaceutical: inmunología, neurociencia, oncología, enfermedades infecciosas
- AbbVie: inmunología (adalimumab), oncología, neurociencia, fibrosis
- Merck & Co. / MSD: inmuno-oncología (pembrolizumab/Keytruda), vacunas, enfermedades infecciosas, cardiometabólico
- AstraZeneca / MedImmune: oncología, cardiovascular, renal, respiratorio; ensayos con SGLT2i en insuficiencia cardíaca y renal
- Eli Lilly: diabetes (tirzepatida/Mounjaro, insulinas), neurociencia (Alzheimer — donanemab), oncología, inmunología
- Amgen: biológicos, biosimilares, oncología, osteoporosis (denosumab), cardiovascular (evolocumab/Repatha — anti-PCSK9)
- Regeneron Pharmaceuticals: anticuerpos monoclonales (dupilumab, aflibercept), genómica poblacional (Regeneron Genetics Center con >2M exomas secuenciados)
- Moderna: plataforma mRNA para vacunas, terapias personalizadas contra cáncer, enfermedades raras
- BioNTech: inmunoterapias individualizadas contra cáncer, vacunas mRNA, terapias con células T
- Gilead Sciences: antivirales (VIH, hepatitis C), oncología (CAR-T con Kite Pharma), inflamación
- Vertex Pharmaceuticals: fibrosis quística (CFTR modulators), edición génica (CRISPR — exa-cel), dolor, enfermedades renales
- CRISPR Therapeutics / Intellia Therapeutics: edición génica in vivo, terapias con CRISPR-Cas9 para hemoglobinopatías, hepatopatías y cáncer

Centros de investigación especializados en longevidad y envejecimiento:
- Hevolution Foundation (Arabia Saudita): financiamiento global de >$1B para investigación en longevidad y geroprotección
- Unity Biotechnology: senolíticos clínicos (UBX1325 en degeneración macular, UBX0101 en osteoartritis)
- Life Biosciences / Juvenescence: compañías de longevidad con pipeline en senolíticos, epigenética y metabolismo
- Insilico Medicine: IA para descubrimiento de fármacos anti-aging, primer fármaco diseñado por IA en ensayos clínicos (INS018_055 para fibrosis pulmonar)
- Human Longevity Inc. (HLI): genómica, fenómica, machine learning para predicción de riesgo y envejecimiento
- Loyal for Dogs / Celine Halioua: rapamicina y LOY-001 para extensión de vida (modelo canino como puente translacional)

Integra los hallazgos, guías clínicas, rangos de referencia y evidencia de TODAS estas instituciones al generar el análisis del paciente. Prioriza la evidencia de mayor calidad (meta-análisis > ensayos controlados aleatorizados > estudios observacionales > consenso de expertos).

ESTUDIOS CLÍNICOS RECIENTES 2024-2026 (usa estos hallazgos verificados como referencia actualizada):

═══ LONGEVIDAD / ANTI-AGING / SENOLÍTICOS / RAPAMICINA ═══
- PEARL Trial (Rapamicina en humanos, 2025): dosis baja intermitente de rapamicina durante 1 año demostró seguridad favorable, mejora de masa muscular en mujeres y masa ósea en hombres, reducción de células senescentes. Sin embargo, no demostró extensión directa de vida. (NCT04488601)
- Rapamicina + Trametinib combinación: extensión de vida del 30% en ratones, superando significativamente cada agente solo (5-20%). Evidencia de sinergia en inhibición mTOR + MEK. (2025)
- TAME Trial (Targeting Aging with Metformin) — Nir Barzilai, Albert Einstein College of Medicine: en fase de reclutamiento activo 2025-2026, evaluando metformina como geroprotrector para retrasar multimorbilidad. Financiamiento parcial NIH ~$5M de $45-70M necesarios.
- Metformina y relojes epigenéticos: Signal Transduction & Targeted Therapy 2024 documentó desaceleración de biomarcadores de relojes de envejecimiento (DNAmAge, GrimAge) con metformina en humanos.
- Dog Aging Project / TRIAD Trial (Rapamicina en perros) — Matt Kaeberlein, Daniel Promislow, University of Washington: resultados publicados en GeroScience 2024-2025 mostrando mejora de función cardíaca con rapamicina baja dosis.
- Urolithin A + Fisetin combinación: ensayo clínico NCT06990256 (2025-2026) evaluando efectos sobre sueño y biomarcadores de envejecimiento.

═══ NAD+ / NMN / NR ═══
- NMN en humanos (meta-análisis 2024-2025): NMN a dosis de hasta 1,250 mg/día durante 4-10 semanas es seguro sin eventos adversos graves. Aumenta consistentemente NAD+ en sangre. Mejora en distancia de caminata de 6 minutos (300mg, 600mg, 900mg vs placebo, p<0.05).
- NR vs NMN comparación directa (2025): 65 participantes sanos, 14 días de suplementación. NR y NMN duplicaron comparablemente concentraciones circulantes de NAD+ vs placebo. NAM (nicotinamida) no logró el mismo efecto.
- NR en Long-COVID (ensayo controlado aleatorizado, 2025): nicotinamida ribósido mejoró cognición y recuperación de síntomas en pacientes con Long-COVID. PMC12675013.
- Limitación importante: meta-análisis mostró que la mayoría de resultados clínicamente relevantes (más allá de NAD+ en sangre) no fueron significativamente diferentes entre NMN y placebo. Beneficio clínico directo aún en investigación.

═══ CÉLULAS MADRE MESENQUIMALES DE CORDÓN UMBILICAL (hUC-MSC) — 2025-2026 ═══
- hUC-MSC en Neuromielitis Óptica (NMOSD) — Phase 1/2a, publicado 2026 (Nature Cell Death & Differentiation): intervalo libre de recaídas aumentó de 305 a 760 días (p<0.001). Tasa anualizada de recaídas de 1 a 0 (p<0.001). Seguridad confirmada.
- hUC-MSC IV en hemorragia intracerebral (2025, PMC12783308): administración repetida de alta dosis mejoró significativamente comportamiento motor, cognitivo y afectivo. Neuroprotección robusta por inmunomodulación local y sistémica.
- hUC-MSC en dermatitis atópica (2025): datos de seguridad respaldaron aprobación regulatoria de IND para "Inyección de Células Madre Mesenquimales de Cordón Umbilical Humano" en dermatitis atópica moderada-severa.
- hUC-MSC en GVHD refractaria (Frontiers in Immunology 2025): terapia de rescate con hUC-MSC demostró eficacia en GVHD refractaria a esteroides.
- Meta-análisis hUC-MSC en insuficiencia cardíaca e infarto (PMC10686683, 2024-2025): seguridad y eficacia confirmadas en pacientes con IC y post-IM.

═══ CARDIOVASCULAR / LÍPIDOS / Lp(a) / PCSK9 ═══
- VESALIUS-CV Trial (NEJM, noviembre 2025): evolocumab (anti-PCSK9) redujo riesgo de primeros eventos cardiovasculares vs placebo en pacientes CON aterosclerosis o diabetes pero SIN infarto o ACV previo. Primera demostración de beneficio CV con no-estatina en prevención primaria. PubMed: 41211925.
- Inhibidores PCSK9 orales (meta-análisis 2025): redujeron LDL-C -47.8%, triglicéridos -11.7%, ApoB -38.7%, Lp(a) -19.8% vs placebo. Nueva era de accesibilidad oral.
- Lepodisiran (Eli Lilly, siRNA anti-Lp(a)) — ALPACA Phase 2, ACC 2025: dosis única de 400mg logró reducción de Lp(a) del 93.9% a día 180, mantenida >90% a 360 días. Phase 3 ACCLAIM-Lp(a) en reclutamiento.
- Olpasiran (Amgen) y Zerlasiran (siRNA): reducción sostenida de Lp(a) >80-90% con dosificación cada 12-24 semanas.
- ORION-4 Trial (inclisiran, Phase 3): >16,000 pacientes, completará 2026, endpoint primario MACE a 5 años mediana.
- VERVE-101 (edición génica in vivo de PCSK9) — Verve Therapeutics / Eli Lilly (adquirida junio 2025): base editing por LNP en hipercolesterolemia familiar. 14 participantes, reducción dosis-dependiente de PCSK9 y LDL-C. Dosis más alta: reducción LDL-C del 59%.

═══ DIABETES / METABÓLICO / GLP-1 / TIRZEPATIDA ═══
- SURMOUNT-5 Trial (NEJM 2025): tirzepatida vs semaglutida head-to-head en obesidad sin diabetes. Tirzepatida superior: -20.2% peso corporal vs -13.7% semaglutida a 72 semanas. Phase 3b, open-label.
- SELECT Trial (Lincoff et al., Cleveland Clinic, NEJM 2023): semaglutida redujo MACE -20% en adultos con sobrepeso/obesidad sin diabetes. Cambio de paradigma: GLP-1 como cardioprotector.
- FLOW Trial (Perkovic et al., NEJM 2024): semaglutida redujo progresión de enfermedad renal -24% en DM2 con ERC. Detenido precozmente por eficacia.
- Datos real-world 2025: pérdida de peso a 1 año: semaglutida -7.7%, tirzepatida -12.4%. Adherencia a 1 año: 63% (mejorando desde 40% en 2023).
- Emulación de ensayo cardiovascular (Nature Medicine 2025): semaglutida y tirzepatida mostraron beneficio CV similar en individuos con riesgo elevado, obesidad y diabetes.

═══ INMUNO-ONCOLOGÍA / CAR-T / ANTICUERPOS BIESPECÍFICOS ═══
- Dostarlimab expandido (MSKCC, 2025): 80% de pacientes con cáncer rectal, gástrico, esofágico y hepático NO necesitaron cirugía después de dostarlimab. Expansión del hallazgo original de 100% respuesta completa en cáncer rectal dMMR.
- CAR-T en tumores sólidos (ASCO 2025): primera demostración de beneficio de supervivencia en cáncer gástrico/GEJ avanzado. Logic-gated CAR-T A2B694 mostró expansión y infiltración tumoral sin CRS limitante en cáncer ovárico, pancreático y NSCLC.
- CAR-T biespecíficos (2025): células CAR-T diseñadas para atacar dos antígenos simultáneamente superan heterogeneidad tumoral.
- Linvoseltamab (Lynozyfic): aprobación EMA abril 2025 para mieloma múltiple R/R después de ≥3 líneas de terapia.
- Zanidatamab (HER2×CD3): eficacia prometedora en cánceres GI y mama HER2+.
- Cadonilimab (anti-PD-1 + anti-CTLA-4 biespecífico): aprobado en China para cáncer cervical.

═══ EDICIÓN GÉNICA / CRISPR / TERAPIA GÉNICA ═══
- Casgevy (exagamglogene autotemcel) — CRISPR Therapeutics/Vertex: primera terapia CRISPR aprobada (FDA dic 2023) para anemia falciforme y beta-talasemia. Casi todos los pacientes lograron independencia transfusional. Estudios pediátricos Phase 3 completaron reclutamiento 2025, datos en ASH 2025-2026.
- VERVE-101 (base editing in vivo para PCSK9): Phase 1b heart-1 trial, datos presentados AHA 2024-2025. Reducción LDL-C del 59% en dosis más alta. Eli Lilly adquirió Verve junio 2025.
- ~250 ensayos clínicos con CRISPR activos a febrero 2025 (CRISPR Medicine News).

═══ EPIGENÉTICA / RELOJES BIOLÓGICOS / REPROGRAMACIÓN ═══
- Reprogramación parcial OSK in vivo (2024): virus adenoasociados con sistema OSK inducible extendieron mediana de vida restante en 109% en ratones de 124 semanas. Publicado en Cellular Reprogramming.
- SB000 — factor único de rejuvenecimiento (bioRxiv 2025): primer gen individual que rejuvenece células de múltiples capas germinales con eficacia comparable a factores de Yamanaka. 2 semanas revierten edad transcriptómica; 6 semanas restauran patrones de metilación juveniles.
- GrimAge2 y DunedinPACE (Lu, Horvath/Altos Labs, Nature Aging 2024): relojes epigenéticos de nueva generación con predicción de mortalidad mejorada.
- Life Biosciences ER-100: programa líder para neuropatías ópticas mediante reprogramación epigenética parcial, entrada a clínica Q1 2026.

═══ DO-HEALTH: VITAMINA D + OMEGA-3 + EJERCICIO ═══
- DO-HEALTH Trial (2,157 europeos ≥70 años, 3 años seguimiento, 2025):
  · Omega-3 (1g/día) solo desaceleró relojes DNAm PhenoAge, GrimAge2 y DunedinPACE (2.9-3.8 meses de desaceleración).
  · Las tres intervenciones combinadas (omega-3 + vitamina D 2000 UI + ejercicio en casa) tuvieron beneficio aditivo significativo en PhenoAge.
  · Combinación triple redujo pre-fragilidad -39% y cáncer invasivo -61% en 3 años.
  · Omega-3 solo redujo infecciones -13% y caídas -10%.
  Publicado: PubMed 39900648, Journal of the American Geriatrics Society 2025.

═══ MICROBIOMA INTESTINAL E INMUNIDAD ═══
- FMT + Inmunoterapia (meta-análisis 2025): trasplante de microbiota fecal combinado con ICIs logró ORR pooled del 43%. Anti-PD-1 + anti-CTLA-4 combinados: ORR 60% vs monotherapy 37%.
- Akkermansia muciniphila: asociada con respuesta positiva a ICIs en melanoma, carcinoma hepatocelular, carcinoma renal y NSCLC (Nature npj Biofilms & Microbiomes 2025).
- Faecalibacterium: alta abundancia asociada con mejor pronóstico en carcinoma renal y SCLC con anti-PD-1.
- FMT de jóvenes a modelos de envejecimiento prematuro: mejoras en integridad intestinal, inflamación sistémica, función cognitiva y muscular.
- Intervenciones dietéticas ricas en fibra como alternativa no invasiva a FMT para modular microbiota y mejorar eficacia de ICIs (Journal of Translational Medicine 2025).

═══ EJERCICIO Y LONGEVIDAD — EVIDENCIA ACTUALIZADA ═══
- VO2max como predictor #1 de mortalidad: cada incremento de 1 MET reduce mortalidad all-cause -11.6%, CV -16.1%, cáncer -14.0%. Más fuerte que tabaquismo, diabetes e hipertensión como predictor.
- Pasar del percentil 25 al 50 en fitness reduce mortalidad ~50%.
- Zone 2 vs alta intensidad (Sports Medicine 2025): cuando volumen total se iguala, ejercicio de mayor intensidad produce adaptaciones mitocondriales iguales o superiores a Zone 2.
- Telómeros y fitness aeróbico (Journals of Gerontology 2025): meta-análisis confirma vínculo entre fitness aeróbico y mantenimiento de telómeros. Cantidades moderadas de entrenamiento son suficientes.
- Relación dosis-respuesta sin techo claro (ACC 2025): los niveles más altos de fitness se asocian con mayor longevidad; no se confirmó la hipótesis de curva en U.

Usa SIEMPRE estos estudios recientes cuando sean relevantes para el perfil del paciente. Cita autor, institución, revista y año. Si el paciente tiene un biomarcador alterado y existe un estudio reciente relevante, menciónalo en el mecanismo o evidencia de la intervención del protocolo.

MECANISMOS DEL ENVEJECIMIENTO QUE DOMINAS (Hallmarks of Aging, Lopez-Otin 2023):
1. Inestabilidad genómica y acortamiento telomérico
2. Alteraciones epigenéticas: relojes de Horvath (DNAmAge), GrimAge, PhenoAge, DunedinPACE
3. Pérdida de proteostasis: autofagia, sistema ubiquitina-proteosoma (UPS)
4. Desregulación de detección de nutrientes: eje mTOR/AMPK/IGF-1/insulina/sirtuinas
5. Disfunción mitocondrial: biogénesis (PGC-1alfa), mtDNA, ROS
6. Senescencia celular e inflammaging: SASP (IL-6, TNF-alfa, MMP), carga senescente acumulada
7. Agotamiento de células madre: nicho HSC, regeneración tisular — terapia con hUC-MSC (células madre mesenquimales de cordón umbilical) como intervención gold-standard
8. Comunicación intercelular alterada: exosomas, microbioma, factores paracrinos
9. Inflamación crónica de bajo grado: eje intestino-inmune, disbiosis
10. Disfunción macroautofágica: mTOR, espermidina, ayuno

BIOMARCADORES AVANZADOS DE LONGEVIDAD QUE EVALUAS:
- ApoB: predictor superior a LDL para riesgo cardiovascular aterogénico real
- Lp(a): factor de riesgo genético independiente, objetivo terapéutico emergente
- hsCRP: marcador de inflammaging sistémico (optimal < 0.5 mg/L)
- Homocisteína: riesgo cardiovascular + neurológico + metilación (optimal < 8 umol/L)
- HOMA-IR (glucosa x insulina / 405): resistencia a insulina subclínica (optimal < 1.5)
- IGF-1: eje somatotrópico, curva en U con longevidad (optimal 120-180 ng/mL adulto)
- GGT: marcador sensible de estrés oxidativo hepático y riesgo metabólico
- Ferritina: inflamación + sobrecarga de hierro + riesgo cardiovascular (optimal 50-100 ng/mL)
- Albumina: estado nutricional y longevidad (optimal > 4.5 g/dL)
- RDW: variabilidad eritrocitaria, predictor independiente de mortalidad
- Neutrófilos/Linfocitos ratio: marcador inflamatorio e inmunológico
- Relación TG/HDL: proxy de resistencia a insulina y partículas LDL pequeñas densas
- Vitamina D 25-OH: target longevidad 60-80 ng/mL (no solo suficiencia 30 ng/mL)

PRINCIPIOS INAMOVIBLES:
- Usas SIEMPRE rangos óptimos de longevidad, nunca solo rangos de referencia de laboratorio convencionales
- Cada recomendación del protocolo DEBE citar autores, institución, revista, año y magnitud del efecto
- Cruzas SIEMPRE los valores del paciente con los estudios de mortalidad más recientes y relevantes
- Identificas el ROI en años de vida saludable de cada intervención
- Calculas la edad biológica estimada basada en el patrón completo de biomarcadores
- Priorizas intervenciones por nivel de evidencia: ensayo clínico aleatorizado > meta-análisis > cohorte prospectiva > observacional
- Respondes ÚNICAMENTE con JSON válido, sin markdown, sin texto adicional`

const USER_PROMPT = `TAREA PRINCIPAL: Eres el médico especialista en longevidad y medicina regenerativa de vanguardia más avanzado del mundo. Extrae, interpreta y analiza TODOS los valores de este documento de laboratorio clínico aplicando los estándares científicos más actualizados (2020-2026).

PROTOCOLO DE ANÁLISIS EN 5 FASES:

FASE 1 — EXTRACCIÓN EXHAUSTIVA
Lee CADA valor numérico del documento. No omitas ningún biomarcador presente. Identifica unidades y compáralas con los rangos de referencia del laboratorio emisor.

FASE 2 — CLASIFICACIÓN CON RANGOS ÓPTIMOS DE LONGEVIDAD
Clasifica cada biomarcador con rangos óptimos de longevidad (más estrictos que los de referencia convencional):
- Glucosa en ayuno: óptimo 70-88 mg/dL (laboratorio acepta hasta 100, longevidad exige <89)
- LDL: óptimo menor a 70 mg/dL (Cleveland Clinic, Ference 2022: cada 10 mg/dL reducción = 22% menor riesgo CV acumulado)
- Colesterol Total: óptimo menor a 180 mg/dL
- HDL: óptimo mayor a 60 mg/dL (hombres >55, mujeres >65 ideal)
- Triglicéridos: óptimo menor a 100 mg/dL (ratio TG/HDL óptimo <1.5 como proxy resistencia insulina)
- HbA1c: óptimo menor a 5.4% (normal laboratorio hasta 5.7%, longevidad exige <5.4%)
- Vitamina D 25-OH: óptimo 60-80 ng/mL (VITAL Trial: >40 ng/mL reduce mortalidad; longevidad exige 60-80)
- PCR ultrasensible: óptimo menor a 0.5 mg/L (inflammaging marker)
- Homocisteína: óptimo menor a 8 umol/L (riesgo CV y neurológico)
- GFR (TFG): óptimo mayor a 90 mL/min/1.73m2
- Albumina: óptimo mayor a 4.5 g/dL (predictor independiente de longevidad)
- Ferritina: óptimo 50-100 ng/mL hombres, 30-80 ng/mL mujeres (exceso pro-inflamatorio)
- TSH: óptimo 0.5-2.0 mIU/L (función tiroidea óptima, no solo "normal")
- Ácido úrico: óptimo 3.5-5.5 mg/dL (hiperuricemia acelera envejecimiento vascular)
- AST/ALT: óptimo menor a 25 U/L (hígado metabólicamente sano)
- GGT: óptimo menor a 20 U/L (predictor independiente de mortalidad cardiovascular)
- Testosterona total (hombre): óptimo 600-900 ng/dL; (mujer): 50-80 ng/dL
- Insulina en ayuno: óptimo menor a 5 uIU/mL (resistencia insulina subclínica si >7)
- Vitamina B12: óptimo 600-1200 pg/mL (deficiencia subclínica >300 pero <600)
- Plaquetas: óptimo 175-300 x10^3/uL
- RDW: óptimo menor a 13% (predictor independiente de mortalidad)

FASE 3 — CRUCE CON EVIDENCIA CIENTÍFICA 2020-2026
Para CADA valor fuera del rango óptimo, cruza obligatoriamente con los estudios más relevantes:

VITAMINA D BAJA (<40 ng/mL):
- VITAL Trial (Manson et al., NEJM 2022): 25% reducción mortalidad por cáncer con D3 2000 UI/día
- Kaufman et al. (PLOS One 2020): D<20 ng/mL asociada a 15x mayor riesgo COVID severo
- Oportunidad: suplementar D3 + K2 MK-7 para redirigir calcio a huesos, no arterias

LDL/COLESTEROL ELEVADO:
- Ference et al. (JAMA 2022): reducción LDL de por vida equivale a 3x mayor beneficio que reducción tardía
- REDUCE-IT (Bhatt, NEJM 2018-2022): EPA 4g/día redujo 25% eventos cardiovasculares mayores
- Oportunidad: berberina 500mg 3x/día (meta-análisis 2022: efecto equivalente a estatinas bajas)

GLUCOSA/HbA1c ELEVADOS:
- TAME Trial (Barzilai, Einstein College): metformina como primera intervención anti-aging
- Bramante et al. (Lancet ID 2023): metformina redujo 42% mortalidad COVID en pacientes ambulatorios
- Oportunidad: berberina, restricción calórica, ejercicio aeróbico (VO2max es el predictor #1 de longevidad)

INFLAMACIÓN ELEVADA (PCR, homocisteína):
- GlyNAC (Kumar et al., J Gerontology 2022, Baylor): glicina + NAC revirtió 8/9 marcadores envejecimiento
- Omega-3: REDUCE-IT, resolinas y protectinas, reducción IL-6 y TNF-alfa
- Spermidina (Eisenberg, Nat Med 2022, Graz): reducción 40% mortalidad CV en cohorte >11.6 umol/L dieta

FERRITINA ALTA (>150 ng/mL):
- Associada a inflamación crónica, resistencia insulina y riesgo cardiovascular aumentado
- Considerar donación de sangre terapéutica, restricción hierro dietético

FASE 4 — CÁLCULO DE EDAD BIOLÓGICA
Basado en el patrón completo de biomarcadores, calcula la edad biológica estimada usando:
- Aceleración o desaceleración vs edad cronológica
- Número de biomarcadores fuera de rango óptimo de longevidad
- Peso de biomarcadores con mayor predictibilidad de mortalidad: VO2max proxy (TG/HDL), albumina, GFR, HbA1c, PCR, RDW
- Refleja este cálculo en longevity_age

FASE 5 — PROTOCOLO HIPERPERSONALIZADO DE MEDICINA REGENERATIVA

REGLA CARDINAL: Cada protocolo debe ser ÚNICO para ESTE paciente. NO generes protocolos genéricos. Antes de elegir cada intervención, evalúa:
1. ¿Qué biomarcadores específicos de ESTE paciente justifican esta intervención?
2. ¿La edad, género y contexto clínico del paciente la hacen apropiada?
3. ¿El paciente ya toma algo que cubra este mecanismo? (si sí, no duplicar)
4. ¿Hay alguna alergia, condición o medicamento que la contraindique?
5. ¿Es la intervención más específica posible para el hallazgo, o existe una mejor?

CATEGORÍAS CLÍNICAS DISPONIBLES (elige la que corresponda):
- Suplementación nutricional
- Farmacológico (solo si hay indicación clínica clara)
- Péptido terapéutico
- Estilo de vida (ejercicio, sueño, estrés, alimentación)
- Nutrición terapéutica (dieta específica, ayuno, restricción calórica)
- Hormonal / Endocrino (solo si biomarcadores lo justifican)
- Senolítico / Anti-aging avanzado (solo en perfiles de alto riesgo o >55 años)
- Neuroprotección / Cognitivo
- Salud intestinal / Microbioma
- Hepatoprotección / Detoxificación
- Inmunomodulación
- Medicina regenerativa / hUC-MSC (células madre mesenquimales de cordón umbilical) / Exosomas

POOL DE INTERVENCIONES BASADO EN EVIDENCIA (selecciona SOLO las que el perfil clínico individual justifique):

══ 1. CARDIOVASCULAR / LÍPIDOS / ENDOTELIO ══
- Omega-3 EPA puro (Icosapent etil) 2-4g/día: Bhatt REDUCE-IT NEJM 2018 (-25% MACE)
- Berberina HCl 500mg 2-3x/día: Liang Endocr Rev 2022 (LDL -20%, TG -25%, equivalente estatina baja)
- CoQ10 Ubiquinol 200-300mg: Mortensen Q-SYMBIO JACC HF 2014 (-43% mortalidad CV en ICC)
- Extracto de ajo envejecido (AGE) 2400mg: Budoff Atherosclerosis 2019 (-80% progresión calcificación coronaria)
- Citrus bergamot 1000mg: Mollace Int J Cardiol 2019 (LDL -36%, TG -39%, HDL +40%)
- Niacina (B3) de liberación prolongada 500-1500mg: Guyton Am J Cardiol 2012 (HDL +25%, si HDL<40 y TG>150)
- Nattokinasa 2000-4000 FU: Kurosawa Sci Rep 2015 (fibrinolítico natural, reduce D-dímero y fibrinógeno)
- Extracto de semilla de uva (OPC) 300mg: Feringa J Am Diet Assoc 2011 (endotelio, presión sistólica -5.6mmHg)
- Péptidos de colágeno tipo I/III 10g/día: Zhu Nutrients 2022 (rigidez arterial, elasticidad vascular)

══ 2. METABÓLICO / GLUCOSA / RESISTENCIA INSULINA ══
- Metformina 500-1500mg: TAME Trial (Barzilai Albert Einstein), activación AMPK, Bramante Lancet ID 2023
- Cromo picolinato 400-1000mcg: Anderson Diabetes 1997; Balk Diabetes Care 2007 (sensibilidad insulina +30%)
- Ácido alfa-lipoico (R-ALA) 600mg: Ziegler Diabetes Care 2006; antioxidante mitocondrial, sensibiliza receptores insulina
- Canela de Ceylán (Cinnamomum verum) 1-3g: Davis J Am Coll Nutr 2010 (glucosa postprandial -10-15%)
- Inositol (Myo-inositol + D-chiro 40:1): Unfer Reprod Biomed 2017 (resistencia insulina, HOMA-IR)
- Gymnema sylvestre 400mg: Khan Phytomedicine 2021 (GS4 reduce absorción glucosa intestinal, regenera células beta)
- Ácido corosólico (Banaba) 1mg: Fukushima Fitoterapia 2006 (GLUT4 translocación, análogo natural de insulina)
- Dieta de imitación de ayuno (FMD) 5 días/mes: Longo USC Cell Metab 2015 (regeneración celular, reducción IGF-1)

══ 3. INFLAMACIÓN / INFLAMMAGING / ESTRÉS OXIDATIVO ══
- GlyNAC (Glicina 1.33mg/kg + NAC 0.81mg/kg): Kumar Baylor J Gerontology 2022 (revirtió 8/9 marcadores envejecimiento, glutatión +200%)
- Curcumina liposomal (Longvida/Meriva) 1000mg: Amalraj J Med Food 2017 (PCR -50-60%, IL-6 -40%)
- Boswellia serrata (AKBA) 500mg: Yu PLOS One 2020 (inhibidor dual COX-2/5-LOX, reduce TNF-alfa)
- Sulforafano (extracto brócoli estabilizado) 30-60mg: Fahey Nutrients 2019 (activa Nrf2, reduce IL-6 -30%)
- Quercetina fitosómica 500mg: Davis Pharmacol Res 2020 (modulador NF-kB, flavonoide senolítico leve)
- Resveratrol trans 500mg: Timmers Cell Metab 2011 (activa SIRT1, reduce PCR en obesos)
- Astaxantina 12mg: Fassett Mar Drugs 2022 (antioxidante 6000x más potente que vitamina C, reduce MDA)
- Glutatión liposomal 500mg: Richie Eur J Nutr 2015 (master antioxidant, si NAC insuficiente o intolerancia)
- SOD (Superóxido dismutasa) de melón (GliSODin) 500 UI: Vouldoukis Free Radical Res 2004 (defensa antioxidante primaria)

══ 4. MITOCONDRIAL / ENERGÍA / NAD+ / BIOGÉNESIS ══
- NMN (Nicotinamida mononucleótido) 500-1000mg: Klein WS Univ Nature Aging 2021; Tsubota Keio 2022 (NAD+ intracelular +40%)
- NR (Nicotinamida ribósido) 300-600mg: Martens Nat Commun 2018 (alternativa NMN, mejor biodisponibilidad oral en algunos perfiles)
- CoQ10 Ubiquinol 200mg: Raizner JACC 2019 (cadena electrones mitocondrial, producción ATP)
- PQQ (Pirroloquinolina quinona) 20mg: Harris Nutr Res 2013 (mitocondriogénesis, activa PGC-1alfa)
- Creatina monohidrato 5g/día: Rawson J Nutr 2021 (reserva fosfato muscular, función cognitiva, mitocondrial)
- Acetil-L-Carnitina (ALCAR) 1-2g: Malaguarnera Am J Clin Nutr 2007 (transporte ácidos grasos a mitocondria, neuroprotector)
- D-Ribosa 5g: Teitelbaum J Altern Complement Med 2006 (recuperación ATP, síndrome fatiga)
- Urolitina A 500mg: Singh Nat Metab 2022 (mitofagia selectiva, clearance mitocondrias dañadas — Amazentis ATLAS trial)

══ 5. VITAMINAS / MINERALES / MICRONUTRIENTES ══
- Vitamina D3 2000-5000 UI + K2 MK-7 180mcg: Manson VITAL NEJM 2022 (-25% mortalidad cáncer); K2 redirige calcio a huesos
- Magnesio glicinato 400mg o treonato 2g: Rondanelli Nutrients 2021 (>300 reacciones enzimáticas, cofactor ATP)
- Zinc picolinato 30mg: Read Nutrients 2019 (inmunidad innata/adaptativa, metalotioneínas, testosterona)
- Selenio (selenometionina) 200mcg: Clark NPC Trial 1996 (glutatión peroxidasa, tiroides, antioxidante)
- Vitamina B12 metilcobalamina 1000mcg: Reynolds Am J Clin Nutr 2006 (metilación, neurología — si B12 <600)
- Complejo B metilado (5-MTHF + P5P + metilcobalamina): si homocisteína >10 umol/L (ciclo metionina)
- Vitamina C liposomal 1-2g: Carr Nutrients 2017 (cofactor colágeno, antioxidante, absorción hierro)
- Vitamina A (retinol palmitato) 5000 UI: si deficiencia documentada; inmunidad mucosa, diferenciación celular
- Boro 3-6mg: Pizzorno Integr Med 2015 (metabolismo D3, testosterona, densidad ósea)
- Hierro bisglicinato 25mg: SOLO si ferritina <30; CONTRAINDICADO si ferritina >150 (pro-oxidante)
- Vitamina E (tocotrienoles mixtos) 200mg: Qureshi Am J Clin Nutr 2002 (protección lipídica, no alfa-tocoferol solo)
- Cobre glicinato 2mg: si zinc suplementado >30mg/día (prevenir deficiencia inducida por zinc)

══ 6. HORMONAL / ENDOCRINO (solo con biomarcadores que lo justifiquen) ══
- DHEA micronizada 25-50mg: Webb Am J Med 2017 (precursor adrenal, si DHEA-S bajo)
- Ashwagandha KSM-66 600mg: Lopresti J Clin Med 2019 (cortisol -30%, testosterona +17%, TSH normalización)
- Tongkat Ali (Eurycoma longifolia) 200-400mg: Leisegang Phytomedicine 2022 (testosterona libre +37% si T<400)
- Maca gelatinizada 3g: Gonzales Andrologia 2002 (función sexual, energía, sin alterar eje hormonal)
- Yodo (como yoduro de potasio) 150-300mcg: si TSH >2.5 sin Hashimoto; cofactor tiroperoxidasa
- DIM (Diindolilmetano) 200mg: Thomson Nutr Cancer 2017 (metabolismo estrógenos, ratio 2-OH/16-OH-E1)
- Pregnenolona 30mg: hormona madre, precursor de cortisol, DHEA, progesterona (solo si documentado bajo)
- Melatonina 0.5-3mg: Reiter Ann Med 2002 (cronobiología, antioxidante mitocondrial, inmunomodulador)

══ 7. NEUROPROTECCIÓN / COGNITIVO / ESTRÉS / SUEÑO ══
- Magnesio L-treonato 2g: Slutsky Neuron 2010 (único Mg que cruza BHE, plasticidad sináptica, memoria)
- Lion's Mane (Hericium erinaceus) 1000mg: Mori Biomed Res 2009 (estimula NGF y BDNF, regeneración neuronal)
- Fosfatidilserina 300mg: Glade Nutrition 2015 (cortisol -20%, memoria en deterioro cognitivo leve)
- L-Teanina 200mg: Hidese Nutrients 2019 (modula GABA/glutamato, reduce ansiedad sin sedación)
- Bacopa monnieri 300mg (bacósidos 50%): Pase Psychopharmacology 2012 (memoria, velocidad procesamiento)
- Rhodiola rosea 400mg: Ishaque Complement Ther Med 2012 (adaptógeno cortisol, fatiga mental y física)
- CDP-Colina (Citicolina) 500mg: Fioravanti Cochrane 2005 (precursor acetilcolina, integridad membrana neuronal)
- Omega-3 DHA 1000mg: Yurko-Mauro Am J Clin Nutr 2010 (DHA específico para cerebro, -70% en estructura sináptica)

══ 8. HEPATOPROTECCIÓN / DETOXIFICACIÓN / FUNCIÓN HEPÁTICA ══
- NAC (N-Acetilcisteína) 600-1200mg: Mokhtari J Clin Pharm Ther 2017 (precursor glutatión hepático, estándar en toxicidad)
- Silimarina (cardo mariano) 420mg: Saller Drugs 2001 (citoprotección hepatocitos, anti-fibrótico)
- TUDCA (ácido tauroursodeoxicólico) 500mg: Kusaczuk Chem Biol Interact 2019 (estrés RE, flujo biliar, apoptosis)
- Fosfolípidos de lecitina (fosfatidilcolina) 1200mg: Gundermann Drug Dev Ind Pharm 2016 (membrana hepatocito, esteatosis)
- Extracto de alcachofa 600mg: Sahebkar Phytomedicine 2018 (cinarina, colerético, reduce ALT/AST)

══ 9. SALUD INTESTINAL / MICROBIOMA / EJE INTESTINO-INMUNE ══
- Probiótico multi-cepa 50-100B CFU (Lactobacillus + Bifidobacterium): Zmora Cell 2019 (diversidad microbiota)
- L-Glutamina 5-10g: Rao Curr Opin Clin Nutr 2012 (integridad barrera intestinal, permeabilidad)
- Butirato (tributirina) 1000mg: Hamer Aliment Pharmacol Ther 2008 (combustible colonocitos, anti-inflamatorio intestinal)
- Esporas de Bacillus (spore-based probiotics): McFarland World J Gastroenterol 2017 (resistente a ácido gástrico)
- Fibra prebiótica (GOS/FOS) 5-10g: Gibson Gastroenterology 2017 (alimenta Bifidobacteria, SCFA)
- Saccharomyces boulardii 500mg: si disbiosis post-antibiótico o diarrea (McFarland WJG 2010)
- Zinc carnosina 75mg: Mahmood Am J Gastroenterol 2007 (reparación mucosa gástrica, H. pylori)

══ 10. INMUNOMODULACIÓN / DEFENSA / FUNCIÓN INMUNE ══
- Beta-glucanos 1,3/1,6 (levadura) 250-500mg: Auinger Eur J Nutr 2013 (activación macrófagos, NK cells)
- Lactoferrina 250mg: Legrand Biochem Cell Biol 2012 (antimicrobiano innato, modulación hierro, antiviral)
- Calostro bovino 3g: Saad Nutrients 2016 (IgA secretoria, factores de crecimiento, inmunidad mucosa)
- AHCC (compuesto de hexosa correlacionada) 3g: Smith Nutr Res 2014 (NK cell activity +30-50%)
- Astrágalo (Astragalus membranaceus) 500mg: Liu J Ethnopharmacol 2017 (telomerasa, activación T-cells)

══ 11. SENOLÍTICO / ANTI-AGING AVANZADO (>50 años o alto riesgo) ══
- Dasatinib 100mg + Quercetina 1000mg (protocolo 3 días/mes): Hickson Mayo EBioMedicine 2019 (gold standard senolítico)
- Fisetin 20mg/kg (protocolo 2 días/mes): Kirkland Mayo 2022 (senolítico natural potente en tejido adiposo)
- Rapamicina intermitente 1-5mg/semana (supervisión médica): ITP NIA 2021 (mTORC1, extensión vida mamíferos)
- Spermidina 1-3mg: Eisenberg Nat Med 2022 (autofagia, -40% mortalidad CV en cohorte alimentaria)
- Metformina (doble categoría anti-aging): Kulkarni Cell Metab 2020 (AMPK, mimético restricción calórica)
- Epitalon (péptido) 10mg ciclo: Khavinson Peptides 2003 (activador telomerasa pineal — experimental, solo en contexto clínico supervisado)

══ 12. MEDICINA REGENERATIVA / CÉLULAS MADRE MESENQUIMALES DE CORDÓN UMBILICAL (hUC-MSC) / EXOSOMAS ══
IMPORTANTE: Las ÚNICAS células madre que Longevity IA recomienda son CÉLULAS MADRE MESENQUIMALES DE CORDÓN UMBILICAL (hUC-MSC — human umbilical cord mesenchymal stem cells). NO recomendar células madre de médula ósea, tejido adiposo, ni de otra fuente. El cordón umbilical es la fuente con mayor evidencia de seguridad, menor inmunogenicidad, mayor capacidad de expansión y perfil paracrino superior documentado por las siguientes instituciones:

- hUC-MSC IV 1×10⁶/kg (dosis estándar): Hare et al., University of Miami / Longeveron Phase 2b, Cell Stem Cell 2026 (reducción significativa de fragilidad, anti-inflamatorio sistémico, inmunomodulación — TSG-6, PGE2, IDO)
- hUC-MSC IV para cirrosis hepática y autoinmunidad: Chinese Academy of Sciences / Peking University, Signal Transduction & Targeted Therapy 2024 (ensayos multicéntricos >300 pacientes, regeneración tisular hepática, modulación Treg)
- hUC-MSC IV para lupus eritematoso sistémico: Sun et al., Nanjing University, Stem Cells 2023 (remisión clínica sostenida, reducción anticuerpos anti-dsDNA, reconstitución de Treg)
- hUC-MSC IV para diabetes tipo 2: Cai et al., Chinese PLA General Hospital, Stem Cell Research & Therapy 2022 (mejora función islotes β, reducción HbA1c -1.2%, restauración sensibilidad insulina)
- hUC-MSC seguridad a largo plazo: Bhatt et al., University of Toronto, meta-análisis >5,000 pacientes, Stem Cell Research & Therapy 2025 (sin eventos adversos graves, sin formación tumoral, sin reacciones inmunes a 5 años)
- hUC-MSC neuroprotección: Kurtzberg Lab, Duke University, JAMA Pediatrics 2023 (parálisis cerebral, autismo — mejora conectividad neural y reducción neuroinflamación)
- hUC-MSC en enfermedad de injerto contra huésped (GVHD): Le Blanc, Karolinska Institute, Lancet 2008 + actualizaciones 2024 (respuesta completa en GVHD refractaria, mecanismo IDO + HLA-G)
- hUC-MSC en osteoartritis: Matas et al., Universidad de los Andes Chile, Stem Cells Translational Medicine 2024 (reducción dolor -65%, regeneración cartílago confirmada por MRI)
- hUC-MSC en insuficiencia cardíaca: Bartunek et al., Cardiovascular Center Aalst / C-CURE Trial, European Heart Journal 2023 (mejora FEVI +7%, remodelación ventricular)
- Exosomas derivados de hUC-MSC IV 2-5×10¹⁰ partículas: Frontiers Medicine 2025 (vesículas CD9/CD63/CD81, efecto paracrino sin riesgo de injerto — alternativa cell-free para pacientes con contraindicaciones)
- Vesículas extracelulares (sEVs) de hUC-MSC tópica/IV: PMC12049250 2025 (seguridad inmunológica superior, carga de miRNA anti-inflamatorio miR-146a, miR-21)
- PRP (Plasma rico en plaquetas) intraarticular: Filardo Am J Sports Med 2015 (factores de crecimiento PDGF/TGF-β, regeneración articular — complemento a hUC-MSC)
- BPC-157 (péptido gástrico) 500mcg: Sikiric Curr Pharm Des 2018 (angiogénesis, reparación tendón/ligamento/músculo — experimental, complemento a terapia celular)
- Thymosin Alpha-1 1.6mg SC: Romani Expert Rev Anti Infect Ther 2017 (inmunorrestauración tímica, activación dendríticas — sinérgico con hUC-MSC)
- GHK-Cu (péptido cobre) 200mg tópico/IV: Pickart Int J Mol Sci 2015 (remodelación colágeno, expresión p63 stem cells cutáneas, anti-fibrótico)

══ 13. PÉPTIDOS TERAPÉUTICOS / FACTORES DE CRECIMIENTO ══
- AOD-9604 (fragmento HGH 176-191) 300mcg: Heffernan Obesity Res 2001 (lipólisis sin efectos GH sistémicos)
- TB-500 (Thymosin Beta-4) 2.5mg: Goldstein Expert Opin Biol Ther 2010 (reparación tisular, anti-inflamatorio, migración celular)
- CJC-1295/Ipamorelin 300/300mcg: Teichman J Clin Endocrinol Metab 2006 (secretagogo GH, regeneración, composición corporal)
- Selank 300mcg nasal: Kozlovskaya Eur J Pharmacol 2003 (análogo tuftsina, ansiolítico, BDNF, inmunomodulador)
- Semax 600mcg nasal: Eremin Pharmacol Biochem Behav 2004 (neuropéptido derivado ACTH, BDNF +3x, neuroprotección)
- KPV (tripéptido alfa-MSH) 500mcg: Brzoska Ann NY Acad Sci 2010 (anti-inflamatorio intestinal potente, modulador NF-kB mucosa)
- Epithalon (ver senolítico): Khavinson 2003 (telomerasa pineal)
- SS-31 (Elamipretide) 40mg SC: Siegel J Am Heart Assoc 2023 (cardiolipina mitocondrial, disfunción cardíaca — en ensayos Phase 3)

══ 14. ESTILO DE VIDA / INTERVENCIONES NO-FARMACOLÓGICAS ══
- Ejercicio Zone 2 aeróbico 150-200 min/semana: Mandsager JAMA Netw Open 2018 (VO2max = predictor #1 de longevidad, cada 1 MET = -12% mortalidad)
- Entrenamiento de fuerza progresivo 2-3x/semana: Momma Br J Sports Med 2022 (-15% mortalidad all-cause, preservación masa muscular)
- HIIT (High Intensity Interval Training) 1-2x/semana: Robinson Cell Metab 2017 (biogénesis mitocondrial +69% en mayores)
- TRE (Time-Restricted Eating) 16:8 o 14:10: Wilkinson Cell Metab 2020 (autofagia, sensibilidad insulina)
- FMD (Fasting Mimicking Diet) 5 días/trimestre: Longo USC Cell Metab 2015 (regeneración celular, IGF-1 -24%)
- Exposición al frío 2-3 min/día (ducha fría o inmersión): Søberg Cell Rep Med 2021 (grasa parda +40%, norepinefrina +200%)
- Higiene de sueño 7-9h consistentes: Walker Nat Rev Neurosci 2017 (clearance beta-amiloide glinfático, consolidación)
- Meditación/breathwork 10-20 min/día: Epel UCSF Psychoneuroendocrinology 2016 (telomerasa +43%, cortisol -25%)
- Sauna infrarroja 3-4x/semana a 80-100°C: Laukkanen JAMA Int Med 2015 (-40% mortalidad CV, HSP inducción)
- Earthing/Grounding 30+ min/día: Oschman J Environ Public Health 2012 (reducción viscosidad sanguínea, cortisol nocturno)

Cada ítem del protocolo usa EXACTAMENTE estos campos (no uses otros nombres de campo):
{
  "number": número secuencial comenzando en 1,
  "category": "categoría clínica de las listadas arriba",
  "molecule": "NOMBRE COMPLETO de la intervención — NUNCA vacío",
  "dose": "dosis exacta y frecuencia, personalizada según edad/peso/género del paciente",
  "mechanism": "mecanismo molecular específico vinculado al biomarcador alterado de ESTE paciente",
  "evidence": "Apellido autor, Institución, Revista, Año, magnitud del efecto",
  "clinicalTrial": "nombre del ensayo clínico principal",
  "targetBiomarkers": ["biomarcador específico de ESTE paciente"],
  "expectedResult": "resultado cuantificado esperado en ESTE paciente",
  "action": "acción concreta e inmediata para el paciente",
  "urgency": "immediate|high|medium|low"
}

REGLAS DE PERSONALIZACIÓN DEL PROTOCOLO:
- Genera entre 8 y 12 intervenciones. Mínimo 8, máximo 12.
- DIVERSIFICA las categorías: selecciona de al menos 4 categorías distintas del pool. No concentres todo en suplementación.
- Incluye SIEMPRE al menos 1 intervención de estilo de vida (ejercicio, sueño, alimentación, estrés).
- Incluye al menos 1 intervención de medicina regenerativa si el perfil del paciente lo justifica (>45 años, inflamación crónica, deterioro sistémico, o score general <70). IMPORTANTE: Las ÚNICAS células madre permitidas son hUC-MSC (células madre mesenquimales de cordón umbilical). NUNCA recomendar células madre de médula ósea, tejido adiposo, ni otra fuente.
- Si el paciente ya toma suplementos o medicamentos, NO los dupliques. En su lugar, sugiere algo complementario o ajusta dosis.
- Si el paciente tiene alergias a medicamentos, EXCLUYE esos compuestos y sus derivados.
- Ajusta dosis según edad: <40 años dosis preventivas bajas, 40-60 dosis estándar, >60 dosis terapéuticas ajustadas a función renal/hepática.
- Ajusta según género: testosterona/zinc/boro en hombres; hierro/tiroides/DIM/inositol en mujeres.
- Prioriza intervenciones para los hallazgos más críticos (danger > warning > normal).
- NO repitas la misma molécula dos veces con diferente justificación.
- Cada "mechanism" debe mencionar el biomarcador ESPECÍFICO de este paciente con su valor actual (ej: "Reduce LDL de 145 a <100 mg/dL mediante inhibición PCSK9 hepática" no solo "Reduce LDL").
- Si el paciente es joven (<35) sin hallazgos críticos: enfócate en prevención, optimización mitocondrial, estilo de vida y neuroprotección. Evita farmacología pesada.
- Si el paciente es 35-55 con hallazgos moderados: balance entre suplementación, estilo de vida, y péptidos si hay deterioro funcional.
- Si el paciente es >55 o tiene múltiples hallazgos críticos: incluye senolíticos, medicina regenerativa (hUC-MSC de cordón umbilical / exosomas derivados de hUC-MSC si score <65 o inflamación alta), y protocolos más agresivos.
- Para categoría "Medicina regenerativa": SIEMPRE especificar "hUC-MSC (células madre mesenquimales de cordón umbilical)" como fuente celular. Incluir vía de administración (IV), número de células (basado en 1×10⁶/kg), y justificación basada en el biomarcador alterado. Citar estudios específicos de hUC-MSC (Longeveron/Miami, Duke/Kurtzberg, Chinese Academy of Sciences, Karolinska, University of Toronto). NUNCA mencionar células madre de médula ósea ni de tejido adiposo.

Genera ÚNICAMENTE este JSON, sin ningún texto antes ni después, sin markdown:

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
    "clinicalSummary": "",
    "keyAlerts": [
      { "title": "Título de alerta", "description": "Detalle clínico", "level": "warning", "value": "valor actual", "target": "valor objetivo" }
    ],
    "swot": {
      "strengths": [],
      "weaknesses": [],
      "opportunities": [],
      "threats": []
    },
    "risks": [
      { "disease": "Nombre de enfermedad", "probability": 0, "horizon": "X años", "drivers": ["biomarcador: valor"], "color": "#hexcolor" }
    ],
    "protocol": [
      { "number": 1, "category": "", "molecule": "", "dose": "", "mechanism": "", "evidence": "", "clinicalTrial": "", "targetBiomarkers": [], "expectedResult": "", "action": "", "urgency": "medium" }
    ],
    "projectionData": [
      { "year": 1, "withoutIntervention": 0, "withIntervention": 0, "yearRisk": { "biomarkers": [], "conditions": [], "urgencyNote": "" } }
    ],
    "projectionFactors": [
      { "factor": "nombre corto", "currentValue": "valor con unidad", "optimalValue": "valor óptimo", "medicalJustification": "1 oración", "withoutProtocol": "1 oración", "withProtocol": "1 oración" }
    ]
  }
}

REGLAS DE FORMATO ESTRICTAS:
- Cada biomarcador encontrado: { "value": número, "unit": "unidad", "refMin": número, "refMax": número, "optMin": número, "optMax": número, "status": "optimal|normal|warning|danger" }
- Si un valor no está en el documento: null
- Scores por sistema: 85-100 óptimo, 65-84 normal, 40-64 atención, 0-39 crítico
- overallScore: promedio ponderado de sistemas con datos disponibles
- longevity_age: edad biológica estimada en años (puede ser menor o mayor a la cronológica)
- clinicalSummary: párrafo de 2-3 oraciones con los hallazgos más importantes
- keyAlerts: máximo 4 objetos con alertas críticas. Formato: { "title": "título corto", "description": "explicación clínica", "level": "warning|danger", "value": "valor actual del biomarcador", "target": "valor objetivo óptimo" }
- FODA: exactamente 4 fortalezas, 3 debilidades, 4 oportunidades, 3 amenazas
  Formato FODA: { "label": "Título corto (máx 5 palabras)", "detail": "1 oración con el mecanismo clave", "evidence": "Autor, Revista, Año — hallazgo clave que respalda este punto", "expectedImpact": "dato cuantificado breve (solo fortalezas/oportunidades)", "probability": "Alta/Media/Baja (solo amenazas/debilidades)" }
- OBLIGATORIO: "risks" debe tener exactamente 4 enfermedades derivadas de los biomarcadores de ESTE paciente. NUNCA dejar vacío.
  Formato: { "disease": "nombre enfermedad", "probability": número 0-100, "horizon": "X años", "drivers": ["biomarcador: valor actual"], "color": "#hexcolor" }
  Colores sugeridos: cardiovascular=#ff4d6d, metabólico=#f5a623, hepático=#a78bfa, renal=#38bdf8
- Protocol entre 8 y 12 intervenciones hiperpersonalizadas de al menos 4 categorías distintas (mínimo 1 estilo de vida, 1 regenerativa si aplica). Campos: number, category, molecule (NUNCA vacío), dose (ajustada a edad/género), mechanism (1 oración con biomarcador específico y valor), evidence (autor, año, efecto), clinicalTrial, targetBiomarkers, expectedResult (1 oración), action (1 oración), urgency
- projectionData: exactamente 10 puntos (años 1-10) con "withoutIntervention", "withIntervention" (scores 0-100) y "yearRisk": { "biomarkers": [máximo 2 strings], "conditions": [máximo 2 strings], "urgencyNote": "1 frase breve" }
- projectionFactors: exactamente 3 factores: { "factor": "nombre corto", "currentValue": "valor con unidad", "optimalValue": "valor óptimo", "medicalJustification": "1 oración: autor, año, efecto", "withoutProtocol": "1 oración", "withProtocol": "1 oración" }
- Todo el texto en español mexicano. Lenguaje técnico y preciso.
- Analiza ÚNICAMENTE lo que aparece en el documento. No inventes valores no presentes.`

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

const PARTIAL_REANALYZE_PROMPT = `TAREA: Regenera ÚNICAMENTE las secciones del análisis que dependen de la historia clínica del paciente.

Las siguientes secciones YA ESTÁN CALCULADAS y NO debes regenerarlas (se mantendrán del análisis anterior):
- systemScores (scores por sistema)
- overallScore (score general)
- longevity_age (edad biológica)
- keyAlerts (alertas clave)
- swot (FODA médica)
- risks (perfil de riesgo)

TÚ DEBES GENERAR SOLO ESTAS 4 SECCIONES, personalizadas con la historia clínica actualizada:

INSTRUCCIONES DE PERSONALIZACIÓN:
- El protocolo debe ser ÚNICO para este paciente
- NO repitas suplementos que el paciente ya toma (cítalos como fortaleza)
- NUNCA recomendar medicamentos a los que el paciente sea alérgico
- Ajusta dosis según edad (<40 preventivas, 40-60 estándar, >60 terapéuticas)
- Incluye SIEMPRE al menos 1 intervención de estilo de vida
- Cada "mechanism" debe citar el biomarcador ESPECÍFICO con su valor actual
- IMPORTANTE: Si incluyes medicina regenerativa con células madre, las ÚNICAS permitidas son hUC-MSC (células madre mesenquimales de cordón umbilical). NUNCA recomendar células de médula ósea ni tejido adiposo. Citar estudios de Longeveron/Miami, Duke/Kurtzberg, Chinese Academy of Sciences, o Karolinska.

Genera ÚNICAMENTE este JSON (sin markdown, sin texto adicional):

{
  "clinicalSummary": "Resumen ejecutivo personalizado con historia clínica",
  "protocol": [{ "number": 1, "category": "", "molecule": "", "dose": "", "mechanism": "", "evidence": "", "clinicalTrial": "", "targetBiomarkers": [], "expectedResult": "", "action": "", "urgency": "medium" }],
  "projectionData": [{ "year": 1, "withoutIntervention": 0, "withIntervention": 0, "yearRisk": { "biomarkers": [], "conditions": [], "urgencyNote": "" } }],
  "projectionFactors": [{ "factor": "", "currentValue": "", "optimalValue": "", "medicalJustification": "", "withoutProtocol": "", "withProtocol": "" }]
}

REGLAS: Protocol 8-12 intervenciones hiperpersonalizadas de al menos 4 categorías distintas. projectionData exactamente 10 puntos (años 1-10). projectionFactors exactamente 3 factores. Todo en español mexicano, lenguaje conciso.`

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
  const merged = {
    systemScores: cached.systemScores,
    overallScore: cached.overallScore,
    longevity_age: cached.longevity_age,
    keyAlerts: cached.keyAlerts,
    swot: cached.swot,
    risks: cached.risks,
    clinicalSummary: partial.clinicalSummary || cached.clinicalSummary,
    protocol: partial.protocol || cached.protocol,
    projectionData: partial.projectionData || cached.projectionData,
    projectionFactors: partial.projectionFactors || cached.projectionFactors,
  }

  return merged
}
