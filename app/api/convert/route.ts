import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { Buffer } from 'buffer';

export async function POST(req: NextRequest) {
  try {
    const { name, mimeType, data } = await req.json();
    const buffer = Buffer.from(data, 'base64');
    let text = '';

    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // DOCX → plain text
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (
      mimeType === 'text/csv' ||
      mimeType === 'application/csv' ||
      name.endsWith('.csv')
    ) {
      // CSV → just decode as utf-8 text
      text = buffer.toString('utf-8');
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel' ||
      name.endsWith('.xlsx') ||
      name.endsWith('.xls')
    ) {
      // XLSX/XLS → convert each sheet to CSV text
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      text = workbook.SheetNames.map(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        return `--- Sheet: ${sheetName} ---\n${XLSX.utils.sheet_to_csv(sheet)}`;
      }).join('\n\n');
    } else {
      return NextResponse.json({ error: `Unsupported type: ${mimeType}` }, { status: 400 });
    }

    return NextResponse.json({ text: text.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Conversion failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
