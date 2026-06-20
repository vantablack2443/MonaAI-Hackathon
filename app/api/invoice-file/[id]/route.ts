import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const INVOICE_DIR = path.join(
  process.cwd(),
  'hackathon_problems_20260620/hackathon_problems_20260620/questions/invoices_hackathon_20260620_part_1'
);

const FILE_MAP: Record<string, { filename: string; mimeType: string }> = {
  '01': { filename: '01_stadtwerke_gas_de.pdf',        mimeType: 'application/pdf' },
  '02': { filename: '02_microsoft_licenses_en.pdf',    mimeType: 'application/pdf' },
  '03': { filename: '03_eon_strom_de.png',             mimeType: 'image/png' },
  '04': { filename: '04_aws_cloud_en.docx',            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  '05': { filename: '05_buerobedarf_de.png',           mimeType: 'image/png' },
  '06': { filename: '06_brightpath_consulting_en.docx',mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  '07': { filename: '07_hotel_adlon_de.docx',          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  '08': { filename: '08_adobe_creativecloud_en.png',   mimeType: 'image/png' },
  '09': { filename: '09_telekom_internet_de.pdf',      mimeType: 'application/pdf' },
  '10': { filename: '10_dell_hardware_en.png',         mimeType: 'image/png' },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const entry = FILE_MAP[params.id];
  if (!entry) return NextResponse.json({ error: 'Unknown invoice id' }, { status: 404 });

  const filePath = path.join(INVOICE_DIR, entry.filename);
  if (!fs.existsSync(filePath))
    return NextResponse.json({ error: 'File not found on server' }, { status: 404 });

  const data = fs.readFileSync(filePath).toString('base64');
  return NextResponse.json({ filename: entry.filename, mimeType: entry.mimeType, data });
}
