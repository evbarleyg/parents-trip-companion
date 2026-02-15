import JSZip from 'jszip';

function decodeText(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function stripXml(text: string): string {
  const withBreaks = text
    .replaceAll(/<w:p[^>]*>/g, '\n')
    .replaceAll(/<\/w:p>/g, '\n')
    .replaceAll(/<w:br[^>]*\/>/g, '\n');

  const plain = withBreaks
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll(/&amp;/g, '&')
    .replaceAll(/&lt;/g, '<')
    .replaceAll(/&gt;/g, '>');

  return plain
    .split('\n')
    .map((line) => line.replaceAll(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function guessKind(name: string): 'pdf' | 'docx' | 'doc' | 'txt' | 'unknown' {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.docx')) return 'docx';
  if (lower.endsWith('.doc')) return 'doc';
  if (lower.endsWith('.txt')) return 'txt';
  return 'unknown';
}

export async function extractTextFromFile(file: File): Promise<{ text: string; warnings: string[] }> {
  const warnings: string[] = [];
  const kind = guessKind(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (kind === 'txt' || kind === 'doc') {
    const text = decodeText(bytes).trim();
    return { text, warnings };
  }

  if (kind === 'docx') {
    const zip = await JSZip.loadAsync(bytes);
    const xmlFile = zip.file('word/document.xml');

    if (!xmlFile) {
      warnings.push('DOCX file did not contain word/document.xml.');
      return { text: '', warnings };
    }

    const xml = await xmlFile.async('text');
    return { text: stripXml(xml), warnings };
  }

  if (kind === 'pdf') {
    const raw = decodeText(bytes);
    const extracted = (raw.match(/[A-Za-z0-9,:;.'"()\-\s]{6,}/g) || []).join('\n');
    warnings.push(
      'PDF extraction uses edge-safe best effort. If results look incomplete, upload DOCX/TXT for higher reliability.',
    );
    return { text: extracted.trim(), warnings };
  }

  warnings.push('Unknown file type. Attempted plain text decode.');
  return { text: decodeText(bytes).trim(), warnings };
}
