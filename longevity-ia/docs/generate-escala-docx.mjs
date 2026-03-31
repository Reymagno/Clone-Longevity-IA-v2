import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx'
import { readFileSync, writeFileSync } from 'fs'

const md = readFileSync(new URL('./LONGEVITY_IA_Escalabilidad_Codigo.md', import.meta.url), 'utf-8')
const lines = md.split('\n')
const children = []
const NAVY = '050E1B', GOLD = 'C9A84C', ACCENT = '2EAE7B', GRAY = '6B6660'

function textRun(text, opts = {}) { return new TextRun({ text, font: 'Calibri', size: 22, ...opts }) }
function parseLine(line) {
  const parts = []; const regex = /\*\*(.+?)\*\*/g; let last = 0, m
  while ((m = regex.exec(line)) !== null) { if (m.index > last) parts.push(textRun(line.slice(last, m.index))); parts.push(textRun(m[1], { bold: true })); last = m.index + m[0].length }
  if (last < line.length) parts.push(textRun(line.slice(last))); return parts.length ? parts : [textRun(line)]
}

let inTable = false, tableRows = [], tableHeaders = []
function flushTable() {
  if (tableRows.length === 0 && tableHeaders.length === 0) return
  const allRows = [tableHeaders, ...tableRows].filter(r => r.length > 0)
  if (allRows.length === 0) return
  const rows = allRows.map((cells, ri) => new TableRow({ children: cells.map(cell => new TableCell({ children: [new Paragraph({ children: parseLine(cell.trim()), spacing: { before: 40, after: 40 } })], width: { size: Math.floor(9000 / cells.length), type: WidthType.DXA }, shading: ri === 0 ? { fill: NAVY, color: 'FFFFFF' } : undefined })) }))
  children.push(new Table({ rows, width: { size: 9000, type: WidthType.DXA } }))
  children.push(new Paragraph({ text: '', spacing: { after: 120 } }))
  tableRows = []; tableHeaders = []; inTable = false
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  if (line.startsWith('|') && line.includes('|')) { const cells = line.split('|').slice(1, -1); if (i + 1 < lines.length && lines[i + 1]?.match(/^\|[\s-:|]+\|$/)) { tableHeaders = cells; inTable = true; i++; continue }; if (inTable) { tableRows.push(cells); continue } } else if (inTable) { flushTable() }
  if (line.startsWith('---') && line.trim() === '---') continue
  if (line.trim() === '') { children.push(new Paragraph({ text: '', spacing: { after: 60 } })); continue }
  if (line.startsWith('# ') && !line.startsWith('## ')) { children.push(new Paragraph({ children: [textRun(line.replace(/^# /, ''), { bold: true, size: 36, color: NAVY })], heading: HeadingLevel.TITLE, spacing: { before: 200, after: 120 }, alignment: AlignmentType.CENTER })); continue }
  if (line.startsWith('## ')) { children.push(new Paragraph({ children: [textRun(line.replace(/^## /, ''), { bold: true, size: 30, color: NAVY })], heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 120 } })); continue }
  if (line.startsWith('### ')) { children.push(new Paragraph({ children: [textRun(line.replace(/^### /, ''), { bold: true, size: 26, color: ACCENT })], heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } })); continue }
  if (line.startsWith('#### ')) { children.push(new Paragraph({ children: [textRun(line.replace(/^#### /, ''), { bold: true, size: 24, color: GOLD })], heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 60 } })); continue }
  if (line.startsWith('```')) { i++; const cl = []; while (i < lines.length && !lines[i].startsWith('```')) { cl.push(lines[i]); i++ }; for (const c of cl) { children.push(new Paragraph({ children: [textRun(c, { font: 'Consolas', size: 18, color: GRAY })], spacing: { before: 20, after: 20 }, indent: { left: 400 } })) }; children.push(new Paragraph({ text: '', spacing: { after: 80 } })); continue }
  if (line.match(/^- /)) { children.push(new Paragraph({ children: parseLine(line.replace(/^- /, '')), bullet: { level: 0 }, spacing: { before: 40, after: 40 } })); continue }
  if (line.match(/^\s+- /)) { children.push(new Paragraph({ children: parseLine(line.replace(/^\s+- /, '')), bullet: { level: 1 }, spacing: { before: 20, after: 20 } })); continue }
  if (line.match(/^\d+\. /)) { children.push(new Paragraph({ children: parseLine(line.replace(/^\d+\. /, '')), numbering: { reference: 'default-numbering', level: 0 }, spacing: { before: 40, after: 40 } })); continue }
  children.push(new Paragraph({ children: parseLine(line), spacing: { before: 40, after: 40 } }))
}
flushTable()

const doc = new Document({ numbering: { config: [{ reference: 'default-numbering', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }] }] }, sections: [{ properties: { page: { margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 } } }, children }] })
const buffer = await Packer.toBuffer(doc)
writeFileSync(new URL('./LONGEVITY_IA_Escalabilidad_Codigo.docx', import.meta.url), buffer)
console.log('Word document generated successfully')
