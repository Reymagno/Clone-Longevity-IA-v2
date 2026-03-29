'use client'

import { useState } from 'react'
import {
  Network, FlaskConical, AlertTriangle, BookOpen, MousePointer2,
  ArrowRight, ChevronDown, ChevronUp, HelpCircle, ZoomIn, ZoomOut, Target,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────

export interface OrganNode {
  id: string
  name: string
  score: number | null
}

interface Connection {
  from: string
  to: string
  baseWeight: number  // importancia clínica: 1=baja 2=media 3=alta
  mechanism: string
  consequence: string
  evidence: string
}

// ─────────────────────────────────────────────────────────────────
// POSICIONES DE NODOS (W=600, H=455)
// ─────────────────────────────────────────────────────────────────

const POSITIONS: Record<string, { x: number; y: number }> = {
  metabolic:       { x: 292, y: 190 },
  inflammation:    { x: 155, y: 108 },
  cardiovascular:  { x: 118, y: 235 },
  liver:           { x: 162, y: 328 },
  pancreas:        { x: 295, y: 312 },
  kidney:          { x: 432, y: 196 },
  immune:          { x: 52,  y: 348 },
  hematology:      { x: 215, y: 388 },
  endocrine:       { x: 466, y: 322 },
  nervous:         { x: 537, y: 115 },
  musculoskeletal: { x: 356, y: 388 },
  vitamins:        { x: 542, y: 354 },
}

// ─────────────────────────────────────────────────────────────────
// CONEXIONES CLÍNICAS — 19 aristas
// ─────────────────────────────────────────────────────────────────

const CONNECTIONS: Connection[] = [
  {
    from: 'cardiovascular', to: 'inflammation', baseWeight: 3,
    mechanism:    'PCR ↑ + homocisteína ↑ → activación y disfunción del endotelio vascular → depósito de LDL oxidado en la íntima arterial → placa aterosclerótica.',
    consequence:  'Aterosclerosis silenciosa acelerada. Principal causa de infarto agudo de miocardio y ACV de origen inflamatorio.',
    evidence:     'Ridker et al., NEJM 2020 — PCR >3 mg/L duplica el riesgo de eventos cardiovasculares mayores.',
  },
  {
    from: 'cardiovascular', to: 'metabolic', baseWeight: 3,
    mechanism:    'Insulinoresistencia → hipertrigliceridemia → formación de partículas LDL pequeñas-densas (sd-LDL) + HDL↓ → partículas altamente aterogénicas.',
    consequence:  'Dislipidemia aterogénica. Placa coronaria vulnerable y mayor riesgo de eventos coronarios agudos.',
    evidence:     'Ference et al., JAMA 2022 — cada 10 mg/dL de LDL adicional acumula 22 % más riesgo cardiovascular de por vida.',
  },
  {
    from: 'cardiovascular', to: 'liver', baseWeight: 2,
    mechanism:    'NAFLD/NASH → elevación de TG y VLDL, reducción de HDL, aumento de fibrinógeno y PCR de origen hepático → perfil proaterogénico.',
    consequence:  'El hígado graso duplica el riesgo de eventos cardiovasculares mayores, independientemente del perfil lipídico convencional.',
    evidence:     'Kim et al., J Hepatol 2022 — síndrome metabólico-hepático y riesgo cardiovascular.',
  },
  {
    from: 'cardiovascular', to: 'kidney', baseWeight: 2,
    mechanism:    'Disfunción cardíaca → hipoperfusión renal → TFG↓. Hipertensión arterial → daño glomerular crónico → proteinuria → progresión a ERC.',
    consequence:  'Síndrome cardiorrenal bidireccional: la ERC acelera la aterosclerosis; la insuficiencia cardíaca deteriora aún más la función renal.',
    evidence:     'Ronco et al., JACC 2021 — clasificación y manejo integrado del síndrome cardiorrenal.',
  },
  {
    from: 'metabolic', to: 'pancreas', baseWeight: 3,
    mechanism:    'Hiperinsulinemia crónica → glucotoxicidad + lipotoxicidad → estrés del retículo endoplásmico → apoptosis progresiva de células beta pancreáticas.',
    consequence:  'Agotamiento de la reserva secretora pancreática → DM2. El proceso es reversible en estadio de prediabetes con intervención temprana.',
    evidence:     'TAME Trial (Barzilai, Albert Einstein College) — metformina como primera intervención anti-envejecimiento validada.',
  },
  {
    from: 'metabolic', to: 'liver', baseWeight: 3,
    mechanism:    'Insulinoresistencia hepática → activación de lipogénesis de novo (SREBP-1c) → acumulación de grasa intrahepática → NAFLD → NASH → fibrosis.',
    consequence:  'El hígado es el órgano diana primario del síndrome metabólico. Progresión a cirrosis y hepatocarcinoma en 10-20 años sin intervención.',
    evidence:     'Rinella et al., Hepatology 2022 — fisiopatología NAFLD/NASH: eje adiposo-hepático.',
  },
  {
    from: 'metabolic', to: 'inflammation', baseWeight: 2,
    mechanism:    'Tejido adiposo visceral → secreción de IL-6, TNF-α, IL-1β y resistina → activación sistémica del eje NF-κB → inflamación de bajo grado.',
    consequence:  'Metainflamación crónica que retroalimenta la insulinoresistencia y sostiene el inflammaging en todos los tejidos.',
    evidence:     'Hotamisligil, Nature 2022 — obesidad, inflamación y enfermedad crónica: mecanismos moleculares compartidos.',
  },
  {
    from: 'metabolic', to: 'endocrine', baseWeight: 2,
    mechanism:    'Cortisol elevado → gluconeogénesis hepática ↑ + insulinoresistencia periférica. Hiperinsulinemia → supresión de LH → testosterona total↓.',
    consequence:  'Síndrome metabólico + hipogonadismo + obesidad central: triada que acelera el envejecimiento biológico de forma compuesta.',
    evidence:     'Dallman et al., PNAS 2022 — glucocorticoides, estrés metabólico y redistribución de grasa corporal.',
  },
  {
    from: 'metabolic', to: 'kidney', baseWeight: 2,
    mechanism:    'Hiperglucemia → glicación de proteínas de membrana glomerular → engrosamiento de membrana basal → hiperfiltración → daño tubular progresivo.',
    consequence:  'Nefropatía diabética: microalbuminuria → macroalbuminuria → ERC progresiva. Hiperuricemia daña directamente el endotelio tubular renal.',
    evidence:     'Johnson et al., Kidney Int 2021 — hiperuricemia y daño renal progresivo: mecanismos y tratamiento.',
  },
  {
    from: 'liver', to: 'inflammation', baseWeight: 2,
    mechanism:    'GGT ↑ + ferritina ↑ → SASP hepático activo (secretoma de células senescentes) → liberación sistémica de IL-6, IL-8 y TGF-β.',
    consequence:  'El hígado inflamado amplifica el inflammaging sistémico. Riesgo de fibrosis progresiva y enfermedades autoinmunes secundarias.',
    evidence:     'Ruttmann et al., Eur Heart J 2021 — GGT como predictor independiente de mortalidad cardiovascular.',
  },
  {
    from: 'liver', to: 'hematology', baseWeight: 2,
    mechanism:    'El hígado sintetiza factores de coagulación I-XIII, albumina y transferrina. La ferritina hepática regula la disponibilidad de hierro para la eritropoyesis.',
    consequence:  'Disfunción hepática → coagulopatía (INR ↑), hipoalbuminemia y anemia de enfermedad crónica por secuestro de hierro.',
    evidence:     'Cabré et al., Clin Nutr 2020 — albúmina como biomarcador de longevidad y función sintética hepática.',
  },
  {
    from: 'immune', to: 'inflammation', baseWeight: 3,
    mechanism:    'NLR elevado (neutrófilos/linfocitos >3.5) → desequilibrio inmune → activación del SASP → secreción crónica de citocinas proinflamatorias sin infección activa.',
    consequence:  'Activación inmune crónica que sostiene el inflammaging. Predictor independiente de mortalidad en cáncer, COVID-19 y enfermedades cardiovasculares.',
    evidence:     'Fest et al., Eur J Cancer 2021 — NLR >3.5 como predictor de mortalidad: meta-análisis de 21 estudios.',
  },
  {
    from: 'immune', to: 'hematology', baseWeight: 2,
    mechanism:    'Leucocitos, neutrófilos, monocitos y linfocitos comparten células progenitoras hematopoyéticas (HSC) en médula ósea. La inflamación desvía HSCs hacia mielopoyesis.',
    consequence:  'Inflamación crónica agota el nicho de células madre hematopoyéticas → leucopenia funcional + anemia inflamatoria resistente a suplementación de hierro.',
    evidence:     'Furman et al., Nature Med 2019 — inflammaging y agotamiento del nicho hematopoyético.',
  },
  {
    from: 'endocrine', to: 'nervous', baseWeight: 2,
    mechanism:    'Cortisol crónico → atrofia del hipocampo (zona más rica en receptores de glucocorticoides) → deterioro de memoria, aprendizaje y regulación emocional.',
    consequence:  'Deterioro cognitivo progresivo, depresión mayor y mayor riesgo de Alzheimer por neurotoxicidad cortisolúrgica acumulada.',
    evidence:     'McEwen et al., Nat Rev Neurosci 2022 — carga alostática, cortisol y envejecimiento cerebral acelerado.',
  },
  {
    from: 'endocrine', to: 'musculoskeletal', baseWeight: 2,
    mechanism:    'Testosterona → síntesis de proteínas musculares (vía mTOR) + activación de osteoblastos. Vitamina D → absorción intestinal de calcio + mineralización ósea directa.',
    consequence:  'Déficit hormonal → sarcopenia (pérdida 3-5 % de masa muscular/década) + osteoporosis. La sarcopenia multiplica ×3 la mortalidad a 5 años.',
    evidence:     'Cruz-Jentoft et al., Age Ageing 2021 — criterios EWGSOP2 y consecuencias clínicas de la sarcopenia.',
  },
  {
    from: 'nervous', to: 'inflammation', baseWeight: 2,
    mechanism:    'Homocisteína ↑ → daño del endotelio cerebrovascular + neuroinflamación → acumulación acelerada de proteína tau y β-amiloide en corteza e hipocampo.',
    consequence:  'Atrofia hipocampal progresiva. Riesgo elevado de demencia vascular y enfermedad de Alzheimer en un horizonte de 10-15 años.',
    evidence:     'Seshadri et al., NEJM — cada 5 μmol/L extra de homocisteína aumenta 35 % el riesgo de demencia (estudio de Framingham).',
  },
  {
    from: 'nervous', to: 'vitamins', baseWeight: 2,
    mechanism:    'B12 → síntesis de mielina y metabolismo de homocisteína (vía metilación). Vitamina D → expresión de VDR en hipocampo, corteza prefrontal y cerebelo.',
    consequence:  'Déficit de B12 → desmielinización progresiva y deterioro cognitivo silencioso. Déficit de D → depresión y mayor riesgo de Parkinson.',
    evidence:     'Smith et al., PNAS 2022 (Oxford) — suplementación B12+B6+folato: −53 % de atrofia hipocampal en 2 años.',
  },
  {
    from: 'hematology', to: 'vitamins', baseWeight: 2,
    mechanism:    'B12↓ → anemia macrocítica megaloblástica. Ferritina↓ → anemia microcítica ferropénica. Vitamina D regula la producción de eritropoyetina indirectamente.',
    consequence:  'Las deficiencias se superponen y generan anemia mixta. El diagnóstico diferencial es crítico para seleccionar la suplementación correcta.',
    evidence:     'WHO 2020 — criterios diagnósticos de anemia: clasificación morfológica y etiológica actualizada.',
  },
  {
    from: 'musculoskeletal', to: 'vitamins', baseWeight: 2,
    mechanism:    'D3 → absorción intestinal de calcio → mineralización ósea. K2 MK-7 → activación de osteocalcina y MGP → redirige el calcio al hueso e inhibe calcificación vascular.',
    consequence:  'Sin K2: el calcio absorbido por D3 se deposita en arterias → calcificación vascular. Con K2: dirige el calcio al hueso → osteoprotección sin riesgo arterial.',
    evidence:     'Geleijnse et al., Thromb Haemost 2021 — K2 MK-7 y calcificación arterial vs ósea: sinergia indispensable con D3.',
  },
]

// ─────────────────────────────────────────────────────────────────
// ICONOS SIMBÓLICOS POR ÓRGANO (SVG text — cross-browser)
// ─────────────────────────────────────────────────────────────────

const ORGAN_SYMBOL: Record<string, string> = {
  metabolic:       '⚡',
  inflammation:    '◈',
  cardiovascular:  '♥',
  liver:           '⬡',
  pancreas:        '◉',
  kidney:          '⊕',
  immune:          '⬢',
  hematology:      '◆',
  endocrine:       '⊗',
  nervous:         '✦',
  musculoskeletal: '⊞',
  vitamins:        '★',
}

// ─────────────────────────────────────────────────────────────────
// ANIMACIONES SVG (via <style> en <defs>)
// ─────────────────────────────────────────────────────────────────

const SVG_KEYFRAMES = `
  @keyframes pulseRing {
    0%, 100% { opacity: 0.18; }
    50%       { opacity: 0.58; }
  }
  @keyframes flowDash {
    from { stroke-dashoffset: 20; }
    to   { stroke-dashoffset: 0; }
  }
`

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return '#475569'
  if (score >= 85) return '#2EAE7B'
  if (score >= 65) return '#5BA4C9'
  if (score >= 40) return '#D4A03A'
  return '#D4536A'
}

function scoreLabel(score: number | null): string {
  if (score === null) return 'Sin datos'
  if (score >= 85) return 'Óptimo'
  if (score >= 65) return 'Normal'
  if (score >= 40) return 'Atención'
  return 'Crítico'
}

/**
 * Fuerza combinada de la conexión (0–100).
 * F = √(Riesgo_A × Riesgo_B) × (P / 3)
 */
function calcStrength(scoreA: number | null, scoreB: number | null, baseWeight: number): number {
  const rA = Math.max(0, 100 - (scoreA ?? 50))
  const rB = Math.max(0, 100 - (scoreB ?? 50))
  return Math.min(100, Math.sqrt(rA * rB) * (baseWeight / 3))
}

function NodeLabel({ name, cx, cy, r, dimmed }: {
  name: string; cx: number; cy: number; r: number; dimmed: boolean
}) {
  const fill = dimmed ? '#1E4A38' : '#6B6660'
  const words = name.split(' ')
  const line1 = words[0]
  const line2 = words.slice(1).join(' ')
  return (
    <text x={cx} y={cy + r + 13} textAnchor="middle" fontSize={8.5} fontFamily="Space Grotesk, sans-serif" fill={fill}>
      <tspan x={cx} dy="0">{line1}</tspan>
      {line2 && <tspan x={cx} dy="11">{line2.length > 15 ? line2.slice(0, 14) + '…' : line2}</tspan>}
    </text>
  )
}

// ─────────────────────────────────────────────────────────────────
// TIPOS DE PANEL
// ─────────────────────────────────────────────────────────────────

interface SelectedNode {
  organId: string
  organName: string
  score: number | null
  connections: Array<{
    targetId: string
    targetName: string
    mechanism: string
    consequence: string
    evidence: string
    targetScore: number | null
    strength: number
  }>
}

interface SelectedEdge {
  fromName: string
  toName: string
  mechanism: string
  consequence: string
  evidence: string
  strength: number
}

// ─────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────

interface Props {
  organScores: OrganNode[]
}

export function OrganNetworkDiagram({ organScores }: Props) {
  const [hoveredOrgan, setHoveredOrgan]   = useState<string | null>(null)
  const [infoOpen, setInfoOpen]           = useState(false)
  const [selectedNode, setSelectedNode]   = useState<SelectedNode | null>(null)
  const [selectedEdge, setSelectedEdge]   = useState<SelectedEdge | null>(null)
  const [zoom, setZoom]                   = useState(1)
  const [tooltip, setTooltip]             = useState<{
    id: string; name: string; score: number | null; svgX: number; svgY: number
  } | null>(null)

  const scoreMap = Object.fromEntries(organScores.map(o => [o.id, o.score]))
  const nameMap  = Object.fromEntries(organScores.map(o => [o.id, o.name]))

  const W = 600
  const H = 455

  // ViewBox ajustado al zoom (centrado)
  const vbW = W / zoom
  const vbH = H / zoom
  const vbX = (W - vbW) / 2
  const vbY = (H - vbH) / 2

  const nodeRadius = (id: string): number => {
    const s = scoreMap[id]
    if (s === null || s === undefined) return 24
    return 22 + ((100 - s) / 100) * 16
  }

  const getStrength = (conn: Connection) =>
    calcStrength(scoreMap[conn.from] ?? null, scoreMap[conn.to] ?? null, conn.baseWeight)

  // Nodo más crítico (score más bajo con datos)
  const criticalNode = organScores
    .filter(o => o.score !== null)
    .sort((a, b) => (a.score ?? 101) - (b.score ?? 101))[0] ?? null

  // ── Clic en nodo ──────────────────────────────────────────────
  const handleNodeClick = (id: string) => {
    if (selectedNode?.organId === id) { setSelectedNode(null); return }
    setSelectedEdge(null)
    const connections = CONNECTIONS
      .filter(c => c.from === id || c.to === id)
      .map(c => {
        const targetId = c.from === id ? c.to : c.from
        return {
          targetId,
          targetName:  nameMap[targetId] ?? targetId,
          mechanism:   c.mechanism,
          consequence: c.consequence,
          evidence:    c.evidence,
          targetScore: scoreMap[targetId] ?? null,
          strength:    getStrength(c),
        }
      })
      .sort((a, b) => b.strength - a.strength)
    setSelectedNode({ organId: id, organName: nameMap[id] ?? id, score: scoreMap[id] ?? null, connections })
  }

  // ── Clic en arista ────────────────────────────────────────────
  const handleEdgeClick = (conn: Connection) => {
    if (
      selectedEdge?.fromName === (nameMap[conn.from] ?? conn.from) &&
      selectedEdge?.toName   === (nameMap[conn.to]   ?? conn.to)
    ) { setSelectedEdge(null); return }
    setSelectedNode(null)
    setSelectedEdge({
      fromName:    nameMap[conn.from] ?? conn.from,
      toName:      nameMap[conn.to]   ?? conn.to,
      mechanism:   conn.mechanism,
      consequence: conn.consequence,
      evidence:    conn.evidence,
      strength:    getStrength(conn),
    })
  }

  // ── Foco crítico — siempre selecciona, nunca deselecciona ─────
  const focusCritical = () => {
    if (!criticalNode) return
    setSelectedEdge(null)
    const id = criticalNode.id
    const connections = CONNECTIONS
      .filter(c => c.from === id || c.to === id)
      .map(c => {
        const targetId = c.from === id ? c.to : c.from
        return {
          targetId,
          targetName:  nameMap[targetId] ?? targetId,
          mechanism:   c.mechanism,
          consequence: c.consequence,
          evidence:    c.evidence,
          targetScore: scoreMap[targetId] ?? null,
          strength:    getStrength(c),
        }
      })
      .sort((a, b) => b.strength - a.strength)
    setSelectedNode({ organId: id, organName: nameMap[id] ?? id, score: scoreMap[id] ?? null, connections })
  }

  const handleBackgroundClick = () => { setSelectedNode(null); setSelectedEdge(null) }

  const activeOrganId = selectedNode?.organId ?? null

  return (
    <div className="card-medical overflow-hidden">

      {/* ── Encabezado ── */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <Network size={18} className="text-accent shrink-0" />
          <h2 className="text-base font-bold text-foreground">Diagrama de Red — Influencia entre Sistemas</h2>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MousePointer2 size={11} className="shrink-0" />
          Haz clic en un nodo o en una conexión para ver el análisis clínico completo. Vuelve a hacer clic para cerrar.
        </p>
      </div>

      <div className="p-5 space-y-4">

        {/* ── Banner nodo crítico ── */}
        {criticalNode && criticalNode.score !== null && criticalNode.score < 65 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-danger/30 bg-danger/5 animate-fade-in">
            <AlertTriangle size={15} className="text-danger shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">
                Sistema más débil:{' '}
                <span style={{ color: scoreColor(criticalNode.score) }}>{criticalNode.name}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Score {criticalNode.score} · {scoreLabel(criticalNode.score)} ·{' '}
                {CONNECTIONS.filter(c => c.from === criticalNode.id || c.to === criticalNode.id).length} conexiones activas
              </p>
            </div>
            <button
              onClick={focusCritical}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-colors"
              style={{
                background: `${scoreColor(criticalNode.score)}15`,
                color: scoreColor(criticalNode.score),
                border: `1px solid ${scoreColor(criticalNode.score)}35`,
              }}
            >
              <Target size={12} />
              Explorar
            </button>
          </div>
        )}

        {/* ── SVG Network ── */}
        <div className="relative rounded-xl border border-border bg-[#091A12] overflow-hidden">

          {/* Controles de zoom */}
          <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
            <button
              onClick={() => setZoom(z => Math.min(2.5, +(z + 0.25).toFixed(2)))}
              disabled={zoom >= 2.5}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 bg-black/50 text-white/55 hover:text-white/90 hover:bg-black/70 transition-colors disabled:opacity-25"
              title="Acercar"
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={() => setZoom(z => Math.max(0.7, +(z - 0.25).toFixed(2)))}
              disabled={zoom <= 0.7}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 bg-black/50 text-white/55 hover:text-white/90 hover:bg-black/70 transition-colors disabled:opacity-25"
              title="Alejar"
            >
              <ZoomOut size={13} />
            </button>
            {zoom !== 1 && (
              <button
                onClick={() => setZoom(1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 bg-black/50 text-white/55 hover:text-white/90 hover:bg-black/70 transition-colors text-[9px] font-mono font-bold"
                title="Restablecer zoom"
              >
                1×
              </button>
            )}
          </div>

          {/* Botón foco crítico (esquina superior izquierda del SVG) */}
          {criticalNode && (
            <button
              onClick={focusCritical}
              className="absolute top-3 left-3 z-10 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-white/10 bg-black/50 text-white/55 hover:text-white/90 hover:bg-black/70 transition-colors"
              title="Ir al sistema más débil"
            >
              <Target size={11} />
              Foco crítico
            </button>
          )}

          {/* Tooltip al hacer hover (solo si no hay panel abierto) */}
          {tooltip && !selectedNode && !selectedEdge && (
            <div
              className="pointer-events-none absolute z-20"
              style={{
                left: `${Math.min(88, Math.max(12, ((tooltip.svgX - vbX) / vbW) * 100))}%`,
                top:  `${Math.min(85, Math.max(10, ((tooltip.svgY - vbY) / vbH) * 100))}%`,
                transform: 'translate(-50%, -140%)',
              }}
            >
              <div
                className="px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap border bg-[#060f20]"
                style={{ borderColor: `${scoreColor(tooltip.score)}40` }}
              >
                <p className="text-xs font-semibold text-foreground">{tooltip.name}</p>
                <p className="text-[10px] font-mono mt-0.5" style={{ color: scoreColor(tooltip.score) }}>
                  Score {tooltip.score ?? '–'} · {scoreLabel(tooltip.score)}
                </p>
              </div>
            </div>
          )}

          <svg
            viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
            className="w-full"
            style={{ maxHeight: 455, cursor: 'default' }}
            onClick={handleBackgroundClick}
          >
            <defs>
              {/* Animaciones CSS */}
              <style>{SVG_KEYFRAMES}</style>

              {/* Filtros de glow */}
              <filter id="glow-node" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glow-soft" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>

              {/* Gradientes por conexión */}
              {CONNECTIONS.map((conn, i) => {
                const p1 = POSITIONS[conn.from]
                const p2 = POSITIONS[conn.to]
                if (!p1 || !p2) return null
                return (
                  <linearGradient key={`grad-${i}`} id={`eg-${i}`}
                    x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} gradientUnits="userSpaceOnUse">
                    <stop offset="0%"   stopColor={scoreColor(scoreMap[conn.from] ?? null)} />
                    <stop offset="100%" stopColor={scoreColor(scoreMap[conn.to]   ?? null)} />
                  </linearGradient>
                )
              })}
            </defs>

            {/* Fondo — extendido para cubrir zoom-out */}
            <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#091A12" />
            {Array.from({ length: Math.ceil(W / 32) }).map((_, xi) =>
              Array.from({ length: Math.ceil(H / 32) }).map((_, yi) => (
                <circle key={`d-${xi}-${yi}`} cx={xi * 32 + 4} cy={yi * 32 + 4} r={0.6} fill="#1E4A38" />
              ))
            )}

            {/* ── ARISTAS ── */}
            {CONNECTIONS.map((conn, i) => {
              const p1 = POSITIONS[conn.from]
              const p2 = POSITIONS[conn.to]
              if (!p1 || !p2) return null

              const strength       = getStrength(conn)
              const isEdgeSelected = selectedEdge?.fromName === (nameMap[conn.from] ?? conn.from) &&
                                     selectedEdge?.toName   === (nameMap[conn.to]   ?? conn.to)
              const isHighlighted  = activeOrganId === conn.from || activeOrganId === conn.to
              const isDimmed       = (activeOrganId !== null || selectedEdge !== null) &&
                                     !isHighlighted && !isEdgeSelected

              const sw     = isEdgeSelected ? (1.5 + (strength / 100) * 5) : (1 + (strength / 100) * 4.5)
              const baseOp = 0.12 + (strength / 100) * 0.70
              const op     = isDimmed       ? 0.04 :
                             isEdgeSelected ? 1 :
                             isHighlighted  ? Math.min(1, baseOp * 1.4) : baseOp

              // Punta de flecha direccional al 68 % de la línea (from → to)
              const t  = 0.68
              const ax = p1.x + t * (p2.x - p1.x)
              const ay = p1.y + t * (p2.y - p1.y)
              const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI

              return (
                <g key={`edge-${i}`} onClick={(e) => { e.stopPropagation(); handleEdgeClick(conn) }}>
                  {/* Línea principal con gradiente */}
                  <line
                    x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                    stroke={`url(#eg-${i})`}
                    strokeWidth={sw}
                    strokeLinecap="round"
                    opacity={op}
                    style={{ transition: 'opacity 0.2s, stroke-width 0.15s' }}
                  />
                  {/* Flujo animado al seleccionar la arista */}
                  {isEdgeSelected && (
                    <line
                      x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                      stroke="white"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeDasharray="6 14"
                      opacity={0.38}
                      style={{ animation: 'flowDash 1.1s linear infinite' }}
                    />
                  )}
                  {/* Flecha de dirección (from → to) */}
                  {!isDimmed && (
                    <polygon
                      points="-5,-3 6,0 -5,3"
                      fill={scoreColor(scoreMap[conn.to] ?? null)}
                      fillOpacity={op * 0.9}
                      transform={`translate(${ax},${ay}) rotate(${angle})`}
                      style={{ pointerEvents: 'none', transition: 'fill-opacity 0.2s' }}
                    />
                  )}
                  {/* Área de hit ampliada */}
                  <line
                    x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                    stroke="transparent" strokeWidth={18}
                    style={{ cursor: 'pointer' }}
                  />
                </g>
              )
            })}

            {/* ── NODOS ── */}
            {organScores.map(({ id, name, score }) => {
              const pos = POSITIONS[id]
              if (!pos) return null

              const color       = scoreColor(score)
              const r           = nodeRadius(id)
              const isSelected  = activeOrganId === id
              const isHovered   = hoveredOrgan === id
              const isConnected = activeOrganId !== null &&
                CONNECTIONS.some(c => (c.from === activeOrganId && c.to === id) || (c.to === activeOrganId && c.from === id))
              const isDimmed    = (activeOrganId !== null || selectedEdge !== null) &&
                                  !isSelected && !isConnected

              return (
                <g
                  key={id}
                  style={{ cursor: 'pointer', transition: 'opacity 0.2s', opacity: isDimmed ? 0.18 : 1 }}
                  onClick={(e) => { e.stopPropagation(); handleNodeClick(id) }}
                  onMouseEnter={() => {
                    setHoveredOrgan(id)
                    setTooltip({ id, name, score, svgX: pos.x, svgY: pos.y })
                  }}
                  onMouseLeave={() => {
                    setHoveredOrgan(null)
                    setTooltip(null)
                  }}
                  filter={isSelected ? 'url(#glow-node)' : (isHovered || isConnected) ? 'url(#glow-soft)' : undefined}
                >
                  {/* Anillo pulsante para nodos en riesgo */}
                  {score !== null && score < 65 && !isDimmed && (
                    <circle
                      cx={pos.x} cy={pos.y} r={r + 9}
                      fill="none" stroke={color} strokeWidth={1.2}
                      style={{ animation: 'pulseRing 2.2s ease-in-out infinite' }}
                    />
                  )}
                  {/* Anillo de selección */}
                  {isSelected && (
                    <circle cx={pos.x} cy={pos.y} r={r + 4}
                      fill="none" stroke={color} strokeWidth={2} opacity={0.6} />
                  )}
                  {/* Círculo principal */}
                  <circle
                    cx={pos.x} cy={pos.y} r={r}
                    fill={isSelected ? `${color}28` : `${color}14`}
                    stroke={color}
                    strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.5}
                  />
                  {/* Símbolo del órgano */}
                  <text
                    x={pos.x} y={pos.y - 4}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={11} fill={color}
                    style={{ userSelect: 'none' }}
                  >
                    {ORGAN_SYMBOL[id] ?? '○'}
                  </text>
                  {/* Score */}
                  <text
                    x={pos.x} y={pos.y + 8}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={9} fontWeight="700"
                    fontFamily="DM Mono, monospace" fill={color}
                    style={{ userSelect: 'none' }}
                  >
                    {score !== null ? score : '–'}
                  </text>
                  {/* Etiqueta */}
                  <NodeLabel name={name} cx={pos.x} cy={pos.y} r={r} dimmed={isDimmed} />
                </g>
              )
            })}
          </svg>
        </div>

        {/* ── PANEL: nodo seleccionado ── */}
        {selectedNode && (
          <div className="rounded-xl border border-accent/25 bg-card overflow-hidden animate-fade-in">

            <div
              className="flex items-center gap-3 px-5 py-4 border-b border-border"
              style={{ background: `${scoreColor(selectedNode.score)}08` }}
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-foreground">{selectedNode.organName}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span
                    className="text-xs font-mono px-2.5 py-0.5 rounded-full font-semibold"
                    style={{
                      background: `${scoreColor(selectedNode.score)}20`,
                      color: scoreColor(selectedNode.score),
                      border: `1px solid ${scoreColor(selectedNode.score)}40`,
                    }}
                  >
                    Score {selectedNode.score ?? '–'} / 100
                  </span>
                  <span className="text-sm text-muted-foreground">{scoreLabel(selectedNode.score)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] text-muted-foreground">{selectedNode.connections.length} sistemas</p>
                <p className="text-[11px] text-muted-foreground">conectados</p>
              </div>
            </div>

            <div className="px-5 pt-4 pb-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Influencia clínica sobre cada sistema conectado — ordenado por impacto combinado
              </p>
            </div>

            <div className="px-5 pb-5 space-y-3">
              {selectedNode.connections.map((c, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border overflow-hidden"
                  style={{ borderLeftWidth: 3, borderLeftColor: scoreColor(c.targetScore) }}
                >
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/30">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: scoreColor(c.targetScore) }} />
                      <span className="text-sm font-semibold text-foreground">{c.targetName}</span>
                      <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        Score {c.targetScore ?? '–'} — {scoreLabel(c.targetScore)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-20 h-1.5 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${c.strength}%`, background: 'linear-gradient(90deg, #2EAE7B, #D4A03A 55%, #D4536A)' }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
                        {Math.round(c.strength)}%
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-border/50">
                    <div className="flex gap-3 px-4 py-3">
                      <FlaskConical size={12} className="text-info mt-px shrink-0" />
                      <div>
                        <p className="text-[10px] font-semibold text-info uppercase tracking-wider mb-1">Mecanismo bioquímico</p>
                        <p className="text-xs text-foreground/85 leading-relaxed">{c.mechanism}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 px-4 py-3">
                      <AlertTriangle size={12} className="text-warning mt-px shrink-0" />
                      <div>
                        <p className="text-[10px] font-semibold text-warning uppercase tracking-wider mb-1">Consecuencia clínica sin tratamiento</p>
                        <p className="text-xs text-foreground/85 leading-relaxed">{c.consequence}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 px-4 py-3 bg-muted/10">
                      <BookOpen size={12} className="text-accent mt-px shrink-0" />
                      <div>
                        <p className="text-[10px] font-semibold text-accent uppercase tracking-wider mb-1">Evidencia científica</p>
                        <p className="text-xs text-muted-foreground font-mono leading-relaxed">{c.evidence}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PANEL: arista seleccionada ── */}
        {selectedEdge && (
          <div className="rounded-xl border border-warning/30 bg-card overflow-hidden animate-fade-in">

            <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-[#D4A03A08]">
              <span className="text-sm font-bold text-foreground">{selectedEdge.fromName}</span>
              <div className="flex-1 flex items-center gap-1">
                <div className="flex-1 h-px bg-gradient-to-r from-border/40 via-warning/50 to-border/40" />
                <ArrowRight size={12} className="text-warning shrink-0" />
                <div className="flex-1 h-px bg-gradient-to-r from-border/40 via-warning/50 to-border/40" />
              </div>
              <span className="text-sm font-bold text-foreground">{selectedEdge.toName}</span>
            </div>

            <div className="divide-y divide-border/50">
              <div className="flex gap-3 px-5 py-4">
                <FlaskConical size={13} className="text-info shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-semibold text-info uppercase tracking-wider mb-1.5">Mecanismo bioquímico</p>
                  <p className="text-sm text-foreground/85 leading-relaxed">{selectedEdge.mechanism}</p>
                </div>
              </div>
              <div className="flex gap-3 px-5 py-4">
                <AlertTriangle size={13} className="text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-semibold text-warning uppercase tracking-wider mb-1.5">Consecuencia clínica sin tratamiento</p>
                  <p className="text-sm text-foreground/85 leading-relaxed">{selectedEdge.consequence}</p>
                </div>
              </div>
              <div className="flex gap-3 px-5 py-4 bg-muted/10">
                <BookOpen size={13} className="text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-semibold text-accent uppercase tracking-wider mb-1.5">Evidencia científica</p>
                  <p className="text-sm text-muted-foreground font-mono leading-relaxed">{selectedEdge.evidence}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 px-5 py-3">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Impacto combinado</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${selectedEdge.strength}%`, background: 'linear-gradient(90deg, #2EAE7B, #D4A03A 55%, #D4536A)' }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-foreground shrink-0 w-10 text-right">
                  {Math.round(selectedEdge.strength)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Estado vacío ── */}
        {!selectedNode && !selectedEdge && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-border/40 bg-muted/20">
            <MousePointer2 size={14} className="text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Haz clic en un <span className="text-foreground font-medium">nodo</span> para ver cómo ese sistema afecta a los demás, o en una{' '}
              <span className="text-foreground font-medium">conexión</span> para leer el mecanismo clínico completo.
            </p>
          </div>
        )}

        {/* ── FÓRMULAS EXPLICADAS ── */}
        <div className="space-y-3">
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-info/8 border-b border-border">
              <div className="w-2 h-2 rounded-full bg-info shrink-0" />
              <p className="text-xs font-bold text-info uppercase tracking-wider">Cómo se calcula el Score por sistema</p>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <div className="flex gap-2.5">
                  <span className="text-[11px] font-mono text-info shrink-0 w-4">1.</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    A cada biomarcador se le asigna un <strong className="text-foreground">estado</strong> según su posición respecto al rango óptimo de longevidad:<br />
                    <span className="font-mono text-accent">óptimo = 100</span> · <span className="font-mono text-info">normal = 72</span> · <span className="font-mono text-warning">atención = 42</span> · <span className="font-mono text-danger">crítico = 12</span>
                  </p>
                </div>
                <div className="flex gap-2.5">
                  <span className="text-[11px] font-mono text-info shrink-0 w-4">2.</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Se asigna un <strong className="text-foreground">peso clínico</strong> según la relevancia del biomarcador:<br />
                    <span className="font-mono">alto = 3 · medio = 2 · bajo = 1</span><br />
                    Ejemplo: el LDL pesa 3 en Cardiovascular; la bilirrubina pesa 1.
                  </p>
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="flex gap-2.5">
                  <span className="text-[11px] font-mono text-info shrink-0 w-4">3.</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Se calcula la <strong className="text-foreground">media ponderada</strong>:<br />
                    <span className="font-mono text-foreground bg-muted/50 px-1.5 py-0.5 rounded text-[10px]">
                      Score = Σ(Estado_i × Peso_i) / Σ(Peso_i)
                    </span>
                  </p>
                </div>
                <div className="flex gap-2.5">
                  <span className="text-[11px] font-mono text-info shrink-0 w-4">4.</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Interpretación</strong>: 85–100 = Óptimo · 65–84 = Normal · 40–64 = Atención · 0–39 = Crítico.<br />
                    Un nodo más grande significa mayor riesgo: <span className="font-mono">Radio = 22 + (Riesgo/100) × 16 px</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-warning/8 border-b border-border">
              <div className="w-2 h-2 rounded-full bg-warning shrink-0" />
              <p className="text-xs font-bold text-warning uppercase tracking-wider">Cómo se calcula el grosor de las conexiones</p>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <div className="flex gap-2.5">
                  <span className="text-[11px] font-mono text-warning shrink-0 w-4">1.</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Se calcula el <strong className="text-foreground">riesgo individual</strong>:<br />
                    <span className="font-mono text-foreground">Riesgo_i = 100 − Score_i</span><br />
                    Un sistema con Score 40 tiene Riesgo 60.
                  </p>
                </div>
                <div className="flex gap-2.5">
                  <span className="text-[11px] font-mono text-warning shrink-0 w-4">2.</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Se aplica la <strong className="text-foreground">media geométrica</strong>:<br />
                    <span className="font-mono text-foreground">√(Riesgo_A × Riesgo_B)</span><br />
                    Si uno está sano, el impacto se atenúa. Si ambos están en riesgo, es máximo.
                  </p>
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="flex gap-2.5">
                  <span className="text-[11px] font-mono text-warning shrink-0 w-4">3.</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Se escala por el <strong className="text-foreground">peso clínico de la evidencia</strong> (P = 1–3):<br />
                    <span className="font-mono text-foreground bg-muted/50 px-1.5 py-0.5 rounded text-[10px]">
                      F = √(R_A × R_B) × (P / 3)
                    </span>
                  </p>
                </div>
                <div className="flex gap-2.5">
                  <span className="text-[11px] font-mono text-warning shrink-0 w-4">4.</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    F (0–100) determina el <strong className="text-foreground">grosor</strong> (1–5.5 px) y la <strong className="text-foreground">opacidad</strong>. Las <strong className="text-foreground">flechas</strong> indican la dirección del mecanismo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Información adicional (desplegable) ── */}
        <div>
          <button
            onClick={() => setInfoOpen(v => !v)}
            className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors text-left group"
          >
            <HelpCircle size={14} className="text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors flex-1">
              Información adicional — fórmulas y ejemplos numéricos
            </span>
            {infoOpen ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
          </button>

          {infoOpen && (
            <div className="mt-3 space-y-4 animate-fade-in">

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-accent/8 border-b border-border">
                  <p className="text-xs font-bold text-accent uppercase tracking-wider">1 · Clasificación de estado de cada biomarcador</p>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    La IA asigna un <strong className="text-foreground">estado cualitativo</strong> a cada biomarcador comparando su valor con el rango de longevidad óptima. Ese estado se traduce a un valor numérico <strong className="text-foreground">E_i</strong>:
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Estado</th>
                          <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Condición</th>
                          <th className="text-right py-2 font-semibold text-muted-foreground">E_i</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        <tr><td className="py-1.5 pr-4 font-semibold text-accent">Óptimo</td><td className="py-1.5 pr-4 text-muted-foreground">Valor dentro del rango óptimo de longevidad</td><td className="py-1.5 text-right font-mono text-accent">100</td></tr>
                        <tr><td className="py-1.5 pr-4 font-semibold text-info">Normal</td><td className="py-1.5 pr-4 text-muted-foreground">Dentro del rango de referencia pero fuera del óptimo</td><td className="py-1.5 text-right font-mono text-info">72</td></tr>
                        <tr><td className="py-1.5 pr-4 font-semibold text-warning">Atención</td><td className="py-1.5 pr-4 text-muted-foreground">Fuera del rango de referencia (desviación moderada)</td><td className="py-1.5 text-right font-mono text-warning">42</td></tr>
                        <tr><td className="py-1.5 pr-4 font-semibold text-danger">Crítico</td><td className="py-1.5 pr-4 text-muted-foreground">Fuera del rango de referencia (desviación severa)</td><td className="py-1.5 text-right font-mono text-danger">12</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-info/8 border-b border-border">
                  <p className="text-xs font-bold text-info uppercase tracking-wider">2 · Score por sistema — ejemplo con el sistema Cardiovascular</p>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Cada biomarcador tiene un <strong className="text-foreground">peso clínico W_i</strong> (1–3) según su relevancia en la enfermedad cardiovascular:
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">Biomarcador</th>
                          <th className="text-right py-2 pr-3 font-semibold text-muted-foreground">Valor</th>
                          <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">Estado</th>
                          <th className="text-right py-2 pr-3 font-semibold text-muted-foreground">E_i</th>
                          <th className="text-right py-2 pr-3 font-semibold text-muted-foreground">W_i</th>
                          <th className="text-right py-2 font-semibold text-muted-foreground">E_i × W_i</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        <tr><td className="py-1.5 pr-3 font-mono text-foreground">LDL</td><td className="py-1.5 pr-3 text-right text-warning font-mono">148 mg/dL</td><td className="py-1.5 pr-3 text-warning">Atención</td><td className="py-1.5 pr-3 text-right font-mono text-warning">42</td><td className="py-1.5 pr-3 text-right font-mono">3</td><td className="py-1.5 text-right font-mono text-foreground">126</td></tr>
                        <tr><td className="py-1.5 pr-3 font-mono text-foreground">HDL</td><td className="py-1.5 pr-3 text-right text-info font-mono">52 mg/dL</td><td className="py-1.5 pr-3 text-info">Normal</td><td className="py-1.5 pr-3 text-right font-mono text-info">72</td><td className="py-1.5 pr-3 text-right font-mono">3</td><td className="py-1.5 text-right font-mono text-foreground">216</td></tr>
                        <tr><td className="py-1.5 pr-3 font-mono text-foreground">PCR</td><td className="py-1.5 pr-3 text-right text-danger font-mono">4.1 mg/L</td><td className="py-1.5 pr-3 text-danger">Crítico</td><td className="py-1.5 pr-3 text-right font-mono text-danger">12</td><td className="py-1.5 pr-3 text-right font-mono">3</td><td className="py-1.5 text-right font-mono text-foreground">36</td></tr>
                        <tr><td className="py-1.5 pr-3 font-mono text-foreground">Triglicéridos</td><td className="py-1.5 pr-3 text-right text-warning font-mono">162 mg/dL</td><td className="py-1.5 pr-3 text-warning">Atención</td><td className="py-1.5 pr-3 text-right font-mono text-warning">42</td><td className="py-1.5 pr-3 text-right font-mono">2</td><td className="py-1.5 text-right font-mono text-foreground">84</td></tr>
                        <tr><td className="py-1.5 pr-3 font-mono text-foreground">Homocisteína</td><td className="py-1.5 pr-3 text-right text-accent font-mono">8 μmol/L</td><td className="py-1.5 pr-3 text-accent">Óptimo</td><td className="py-1.5 pr-3 text-right font-mono text-accent">100</td><td className="py-1.5 pr-3 text-right font-mono">2</td><td className="py-1.5 text-right font-mono text-foreground">200</td></tr>
                        <tr className="border-t-2 border-border bg-muted/20">
                          <td colSpan={4} className="py-2 pr-3 text-right text-muted-foreground font-semibold">Totales →</td>
                          <td className="py-2 pr-3 text-right font-mono font-bold text-foreground">Σ W = 13</td>
                          <td className="py-2 text-right font-mono font-bold text-foreground">Σ EW = 662</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="rounded-lg bg-muted/30 px-4 py-3 font-mono text-[11px] space-y-1">
                    <p className="text-muted-foreground">Score = 662 / 13</p>
                    <p className="text-foreground font-bold">= <span className="text-warning">50.9</span> → estado <span className="text-warning">Atención</span> (40–64)</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-warning/8 border-b border-border">
                  <p className="text-xs font-bold text-warning uppercase tracking-wider">3 · Fuerza de conexión F — ejemplo: Cardiovascular ↔ Inflamación</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="rounded-lg bg-muted/30 px-4 py-3 font-mono text-[11px] space-y-1.5">
                    <p className="text-muted-foreground">Score<sub>cardiovascular</sub> = 51 → Riesgo_A = <span className="text-warning font-bold">49</span></p>
                    <p className="text-muted-foreground">Score<sub>inflamación</sub> = 38 → Riesgo_B = <span className="text-danger font-bold">62</span></p>
                    <div className="border-t border-border/40 pt-1.5 space-y-1">
                      <p className="text-muted-foreground">Media geométrica = √(49 × 62) ≈ <span className="text-foreground font-bold">55.1</span></p>
                      <p className="text-muted-foreground">F = 55.1 × (3/3) = <span className="text-warning font-bold">55.1</span> / 100</p>
                    </div>
                    <div className="border-t border-border/40 pt-1.5">
                      <p className="text-foreground font-bold">Grosor ≈ <span className="text-warning">3.5 px</span> · Opacidad ≈ <span className="text-warning">0.51</span></p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-danger/8 border-b border-border">
                  <p className="text-xs font-bold text-danger uppercase tracking-wider">4 · Radio del nodo — tamaño proporcional al riesgo</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="rounded-lg bg-muted/30 px-4 py-2 font-mono text-[11px]">
                    <p className="text-foreground">Radio = 22 + ((100 − Score) / 100) × 16 px</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Rango: <strong className="text-foreground">22 px</strong> (sistema óptimo) a <strong className="text-foreground">38 px</strong> (crítico, score 0).
                    Los nodos con score &lt; 65 muestran un <strong className="text-foreground">anillo pulsante</strong> como señal visual de riesgo.
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ── Leyenda de color ── */}
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 items-center pt-1">
          {[
            { color: '#2EAE7B', label: 'Óptimo  85–100' },
            { color: '#5BA4C9', label: 'Normal  65–84' },
            { color: '#D4A03A', label: 'Atención  40–64' },
            { color: '#D4536A', label: 'Crítico  0–39' },
            { color: '#475569', label: 'Sin datos' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-[10px] text-muted-foreground font-mono">{label}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="h-1 w-12 rounded bg-gradient-to-r from-danger via-warning to-accent opacity-70" />
            <span className="text-[10px] text-muted-foreground">mayor impacto combinado</span>
          </div>
        </div>

      </div>
    </div>
  )
}
