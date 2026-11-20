export interface PdfLine {
  text: string;
  size?: number;
  bold?: boolean;
  gap?: number;
}

function escapePdfText(input: string): string {
  return input
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Generates a single-page or multi-line A4 PDF 1.4 document using standard Type1 Helvetica fonts.
 */
export function generateTextPdf(lines: PdfLine[]): Buffer {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 48;
  let y = pageHeight - 54;

  const streamOps: string[] = ['BT'];
  for (const line of lines) {
    if (y < 48) break;
    const size = line.size ?? 11;
    const font = line.bold ? 'F2' : 'F1';
    const text = escapePdfText(line.text);
    streamOps.push(`/${font} ${size} Tf`);
    streamOps.push(`1 0 0 1 ${marginX} ${y} Tm`);
    streamOps.push(`(${text}) Tj`);
    y -= line.gap ?? Math.round(size * 1.55);
  }
  streamOps.push('ET');

  const contentStream = streamOps.join('\n');
  const contentLength = Buffer.byteLength(contentStream, 'utf8');

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n`,
    `4 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
  ];

  const header = '%PDF-1.4\n';
  const chunks: Buffer[] = [Buffer.from(header, 'utf8')];
  const offsets: number[] = [0];
  let currentOffset = chunks[0].length;

  for (const obj of objects) {
    offsets.push(currentOffset);
    const buf = Buffer.from(obj, 'utf8');
    chunks.push(buf);
    currentOffset += buf.length;
  }

  const xrefOffset = currentOffset;
  const xrefLines = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`];
  for (let i = 1; i < offsets.length; i++) {
    xrefLines.push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  xrefLines.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );
  chunks.push(Buffer.from(xrefLines.join(''), 'utf8'));

  return Buffer.concat(chunks);
}
