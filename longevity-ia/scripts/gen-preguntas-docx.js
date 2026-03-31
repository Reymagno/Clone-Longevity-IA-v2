const fs = require('fs');
const JSZip = require('jszip');

function escXml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function generateDocx(markdown) {
  const lines = markdown.split('\n');
  let body = '';
  let inTable = false;
  let tableRows = [];

  function flushTable() {
    if (tableRows.length === 0) return '';
    let xml = '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblBorders>';
    xml += '<w:top w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>';
    xml += '<w:left w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>';
    xml += '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>';
    xml += '<w:right w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>';
    xml += '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>';
    xml += '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>';
    xml += '</w:tblBorders></w:tblPr>';

    tableRows.forEach((row, ri) => {
      xml += '<w:tr>';
      row.forEach(cell => {
        const isHeader = ri === 0;
        const shading = isHeader
          ? '<w:shd w:fill="1B3A5C" w:val="clear"/>'
          : (ri % 2 === 0 ? '<w:shd w:fill="F5F5F5" w:val="clear"/>' : '');
        const color = isHeader ? '<w:color w:val="FFFFFF"/>' : '';
        const bold = isHeader ? '<w:b/>' : '';
        xml += '<w:tc><w:tcPr>' + shading + '</w:tcPr>';
        xml += '<w:p><w:pPr><w:spacing w:before="40" w:after="40"/>';
        xml += '<w:rPr>' + bold + color + '<w:sz w:val="18"/></w:rPr></w:pPr>';
        xml += '<w:r><w:rPr>' + bold + color + '<w:sz w:val="18"/></w:rPr>';
        xml += '<w:t xml:space="preserve">' + escXml(cell.trim()) + '</w:t></w:r></w:p></w:tc>';
      });
      xml += '</w:tr>';
    });

    xml += '</w:tbl><w:p/>';
    tableRows = [];
    inTable = false;
    return xml;
  }

  function makeRuns(text) {
    let runs = '';
    const parts = text.split(/(\*\*.*?\*\*)/);
    parts.forEach(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        runs += '<w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">' + escXml(part.replace(/\*\*/g, '')) + '</w:t></w:r>';
      } else {
        runs += '<w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">' + escXml(part) + '</w:t></w:r>';
      }
    });
    return runs;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line.split('|').slice(1, -1);
      if (cells.every(c => /^[\s\-:]+$/.test(c))) continue;
      if (!inTable) { inTable = true; tableRows = []; }
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      body += flushTable();
    }

    if (line.startsWith('# ') && !line.startsWith('## ')) {
      body += '<w:p><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>';
      body += '<w:r><w:rPr><w:sz w:val="36"/><w:b/><w:color w:val="1B3A5C"/></w:rPr>';
      body += '<w:t>' + escXml(line.replace(/^# /, '')) + '</w:t></w:r></w:p>';
    } else if (line.startsWith('## ')) {
      body += '<w:p><w:pPr><w:spacing w:before="360" w:after="120"/>';
      body += '<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="1B3A5C"/></w:pBdr></w:pPr>';
      body += '<w:r><w:rPr><w:sz w:val="28"/><w:b/><w:color w:val="1B3A5C"/></w:rPr>';
      body += '<w:t>' + escXml(line.replace(/^## /, '')) + '</w:t></w:r></w:p>';
    } else if (line.startsWith('### ')) {
      body += '<w:p><w:pPr><w:spacing w:before="240" w:after="80"/></w:pPr>';
      body += '<w:r><w:rPr><w:sz w:val="24"/><w:b/><w:color w:val="2E5D8A"/></w:rPr>';
      body += '<w:t>' + escXml(line.replace(/^### /, '')) + '</w:t></w:r></w:p>';
    } else if (line.startsWith('**Pregunta:**')) {
      body += '<w:p><w:pPr><w:spacing w:before="120" w:after="120"/>';
      body += '<w:shd w:fill="EBF5FB" w:val="clear"/>';
      body += '<w:ind w:left="200" w:right="200"/></w:pPr>';
      body += '<w:r><w:rPr><w:b/><w:i/><w:sz w:val="22"/><w:color w:val="1B3A5C"/></w:rPr>';
      body += '<w:t xml:space="preserve">' + escXml(line.replace(/\*\*/g, '')) + '</w:t></w:r></w:p>';
    } else if (line.startsWith('---')) {
      body += '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="CCCCCC"/></w:pBdr>';
      body += '<w:spacing w:before="120" w:after="120"/></w:pPr></w:p>';
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const text = line.replace(/^[-*] /, '');
      body += '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>';
      body += '<w:spacing w:before="40" w:after="40"/></w:pPr>' + makeRuns(text) + '</w:p>';
    } else if (line.trim() === '') {
      continue;
    } else {
      body += '<w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr>' + makeRuns(line) + '</w:p>';
    }
  }

  if (inTable) body += flushTable();

  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
    '</Types>';

  const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>';

  const wordRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' +
    '</Relationships>';

  const numbering = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0">' +
    '<w:start w:val="1"/><w:numFmt w:val="bullet"/>' +
    '<w:lvlText w:val="&#x2022;"/><w:lvlJc w:val="left"/>' +
    '<w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>' +
    '</w:lvl></w:abstractNum>' +
    '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>' +
    '</w:numbering>';

  const document = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    body +
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>' +
    '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>' +
    '</w:sectPr></w:body></w:document>';

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypes);
  zip.folder('_rels').file('.rels', rels);
  const wordFolder = zip.folder('word');
  wordFolder.file('document.xml', document);
  wordFolder.file('numbering.xml', numbering);
  wordFolder.folder('_rels').file('document.xml.rels', wordRels);

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

const md = fs.readFileSync('docs/LONGEVITY_IA_Preguntas_Importantes.md', 'utf8');
generateDocx(md).then(buf => {
  fs.writeFileSync('docs/LONGEVITY_IA_Preguntas_Importantes.docx', buf);
  console.log('DOCX generated: ' + buf.length + ' bytes');
});
