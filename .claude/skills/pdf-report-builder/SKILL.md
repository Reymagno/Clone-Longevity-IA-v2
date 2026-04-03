---
name: pdf-report-builder
description: >
  Experto en generacion de reportes PDF con jsPDF. Usa esta skill cuando
  necesites crear, modificar o depurar reportes PDF programaticos,
  resolver problemas de texto que se sobrepone, ajustar margenes,
  implementar saltos de pagina inteligentes, agregar branding,
  o disenar layouts de impresion profesionales. Triggers: "reporte PDF",
  "jsPDF", "texto sobrepuesto", "margen", "salto de pagina", "exportar
  PDF", "layout de impresion", "texto sale de la hoja", "PDF truncado".
---

# PDF Report Builder — Reportes Medicos con jsPDF

Eres un experto en generacion de reportes PDF con jsPDF. Produces documentos clinicos profesionales sin problemas de layout.

---

## 1. Reglas de Oro del Layout PDF

### Nunca dibujar texto sin verificar ancho
```typescript
// MAL: el texto puede salirse de la pagina
pdf.text(textoLargo, x, y)

// BIEN: truncar si excede el ancho disponible
function tSafe(str: string, x: number, y: number, maxW: number) {
  let s = str
  while (pdf.getTextWidth(s) > maxW && s.length > 3) {
    s = s.slice(0, -2) + '...'
  }
  pdf.text(s, x, y)
}
```

### Nunca asumir que el texto cabe en una linea
```typescript
// MAL: texto largo en una linea
pdf.text(description, x, y)

// BIEN: word wrap con ancho maximo
const lines = pdf.splitTextToSize(description, maxWidth) as string[]
pdf.text(lines, x, y)
```

### Siempre verificar espacio antes de dibujar
```typescript
// Guard: si no hay espacio, saltar a nueva pagina
function guard(neededMm: number) {
  if (y + neededMm > PAGE_HEIGHT - MARGIN_BOTTOM) {
    nextPage()
  }
}
```

---

## 2. Calculo de Anchos

### Constantes A4
```
Ancho pagina: 210 mm
Alto pagina: 297 mm
Margen tipico: 18 mm cada lado
Ancho util: 210 - (18 * 2) = 174 mm
Alto util: 297 - (18 * 2) = 261 mm
```

### Regla de columnas
Si el texto empieza en `MARGIN + 7` y el margen derecho es `MARGIN`:
```
Ancho disponible para texto = CONTENT_WIDTH - 7 - 7 = CW - 14
```
Si hay un badge/valor a la derecha que ocupa 30mm:
```
Ancho para label izquierdo = CW - 30 - 14
```

### Dos columnas
```
Columna izquierda: desde MARGIN + 7, ancho = CW/2 - 14
Columna derecha:   desde MARGIN + CW/2, ancho = CW/2 - 7
```

---

## 3. Saltos de Pagina

### Bloques atomicos
Cada elemento visual (card, fila de tabla, alerta) debe tratarse como unidad indivisible:
1. Calcular la altura total del bloque
2. Llamar `guard(alturaTotal + margen)`
3. Solo entonces dibujar

### Bloques grandes (mas altos que una pagina)
```typescript
if (blockHeight > usableHeight) {
  // Cortar con margen de seguridad (4mm del borde inferior)
  const maxSlice = remainingSpace - 4
  // Dibujar porcion, nueva pagina, siguiente porcion
}
```

### Nunca cortar en medio de:
- Una fila de tabla (dibujar la fila completa en la siguiente pagina)
- Un titulo de seccion (titulo + al menos 1 elemento deben ir juntos)
- Un par label/valor (ambos en la misma pagina)

---

## 4. Elementos Visuales con jsPDF

### Circulo relleno (para badges, scores)
```typescript
pdf.setFillColor(r, g, b)
pdf.circle(cx, cy, radius, 'F')
```

### Badge pill-shaped (esquinas redondeadas)
```typescript
const pillR = height / 2
pdf.circle(x + pillR, y + pillR, pillR, 'F')      // izquierda
pdf.circle(x + width - pillR, y + pillR, pillR, 'F') // derecha
pdf.rect(x + pillR, y, width - height, height, 'F')  // centro
```

### Barra de progreso con extremos redondeados
```typescript
// Fondo
pdf.setFillColor(235, 238, 242)
pdf.circle(barX + r, barY + r, r, 'F')
pdf.circle(barX + barW - r, barY + r, r, 'F')
pdf.rect(barX + r, barY, barW - 2*r, barH, 'F')
// Relleno
const fillW = (score / 100) * barW
pdf.setFillColor(...scoreColor)
pdf.circle(barX + r, barY + r, r, 'F')
pdf.circle(barX + fillW - r, barY + r, r, 'F')
pdf.rect(barX + r, barY, fillW - 2*r, barH, 'F')
```

### Linea horizontal decorativa
```typescript
pdf.setDrawColor(201, 168, 76) // gold
pdf.setLineWidth(0.3)
pdf.line(MARGIN, y, MARGIN + CW, y)
```

---

## 5. Branding Condicional

```typescript
// Si la funcion recibe branding de clinica, usar su nombre
// Si no, usar el nombre por defecto de la plataforma
function drawHeader() {
  const brandName = branding?.clinic_name ?? 'Longevity IA'
  ink(C.gold); sz(7); b()
  t(brandName, MARGIN, 6.5)
}
```

---

## 6. Debugging de Layout

Cuando el texto se sobrepone o sale de la hoja:

1. **Identificar el punto X donde empieza el texto** (ej: `MG + 7 = 25mm`)
2. **Identificar el punto X del margen derecho** (ej: `PW - MG = 192mm`)
3. **Calcular ancho disponible:** `192 - 25 = 167mm`
4. **Verificar que splitTextToSize usa ese ancho** (no `CW` que es 174mm)
5. **Si hay columna derecha**, restar su ancho del disponible

Regla: `anchoTexto = puntoFinalX - puntoInicioX - paddingDerecho`
