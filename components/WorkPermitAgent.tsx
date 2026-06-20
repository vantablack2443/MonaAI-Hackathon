'use client';
import { useState, useRef } from 'react';
import { Upload, X, ShieldCheck, ShieldX, Clock, AlertTriangle, Loader2, FileText } from 'lucide-react';

interface FileResult {
  name: string;
  isWorkPermit: boolean | null;
  status: 'Valid' | 'Expired' | 'Not yet active' | 'Unknown';
  validUntil: string;
  daysRemaining: string;
  workAuthorization: string;
  confidence: number;
  note?: string;
  raw: string;
}

interface AttachedFile {
  name: string;
  dataUrl: string;
}

interface WorkPermitAgentProps {
  systemPrompt: string;
}

function parseResults(text: string, fileNames: string[]): FileResult[] {
  // Split by document blocks
  const blocks = text.split(/\*\*Document[:\s]/i).filter(s => s.trim().length > 0);

  if (blocks.length === 0) {
    // fallback: treat entire response as one result
    return [parseBlock(text, fileNames[0] || 'Document')];
  }

  return blocks.map((block, i) => parseBlock(block, fileNames[i] || `Document ${i + 1}`));
}

function calcConfidence(fields: {
  isWorkPermit: boolean | null;
  status: FileResult['status'];
  validUntil: string;
  daysRemaining: string;
  workAuthorization: string;
}): number {
  let score = 0;
  // +25 if document is identified as a work permit
  if (fields.isWorkPermit === true) score += 25;
  else if (fields.isWorkPermit === false) score += 10; // identified but not a permit — still extracted info
  // +25 if expiry date was found
  if (fields.validUntil && fields.validUntil !== '—' && fields.validUntil !== 'Not found') score += 25;
  // +20 if status could be determined
  if (fields.status !== 'Unknown') score += 20;
  // +15 if days remaining was calculated
  if (fields.daysRemaining && fields.daysRemaining !== '—') score += 15;
  // +15 if work authorization scope was extracted
  if (fields.workAuthorization && fields.workAuthorization !== '—' && fields.workAuthorization !== 'Not specified') score += 15;
  return Math.min(score, 100);
}

function parseBlock(block: string, fallbackName: string): FileResult {
  const get = (key: string) => {
    const match = block.match(new RegExp(`\\*\\*${key}[:\\*]+\\s*(.+)`, 'i'));
    return match ? match[1].trim().replace(/\*+/g, '') : '';
  };

  const isWorkPermitStr = get('Is Work Permit').toLowerCase();
  const isWorkPermit = isWorkPermitStr.startsWith('yes') ? true : isWorkPermitStr.startsWith('no') ? false : null;

  const statusStr = get('Status').toLowerCase();
  const status: FileResult['status'] =
    statusStr.includes('expired') ? 'Expired' :
    statusStr.includes('not yet') ? 'Not yet active' :
    statusStr.includes('valid') ? 'Valid' : 'Unknown';

  const validUntil = get('Valid Until') || '—';
  const daysRemaining = get('Days Remaining') || '—';
  const workAuthorization = get('Work Authorization') || '—';

  const nameMatch = block.match(/^([^\n*]+)/);
  const docName = nameMatch ? nameMatch[1].replace(/\*+/g, '').trim() : fallbackName;
  const displayName = docName.length > 2 ? docName : fallbackName;

  return {
    name: displayName,
    isWorkPermit,
    status,
    validUntil,
    daysRemaining,
    workAuthorization,
    confidence: calcConfidence({ isWorkPermit, status, validUntil, daysRemaining, workAuthorization }),
    note: get('Note') || undefined,
    raw: block,
  };
}

function ResultCard({ result }: { result: FileResult }) {
  const isValid = result.status === 'Valid' && result.isWorkPermit;
  const isExpired = result.status === 'Expired';
  const notYet = result.status === 'Not yet active';

  const statusColor = isValid ? '#16a34a' : isExpired ? '#dc2626' : notYet ? '#d97706' : '#6b7280';
  const statusBg = isValid ? 'rgba(22,163,74,0.08)' : isExpired ? 'rgba(220,38,38,0.08)' : 'rgba(217,119,6,0.08)';
  const StatusIcon = isValid ? ShieldCheck : isExpired ? ShieldX : Clock;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e5e7eb', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      {/* Card header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ background: '#1a1f3c', borderBottom: '3px solid #e3000b' }}>
        <div className="flex items-center gap-3">
          <FileText size={16} color="rgba(255,255,255,0.7)" />
          <span className="text-white font-medium text-sm truncate max-w-[240px]">{result.name}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: statusBg, color: statusColor, border: `1px solid ${statusColor}33` }}>
          <StatusIcon size={12} />
          {result.status}
        </div>
      </div>

      {/* Card body */}
      <div className="p-5">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>Is Work Permit</p>
            <p className="text-sm font-semibold" style={{ color: result.isWorkPermit === true ? '#16a34a' : result.isWorkPermit === false ? '#dc2626' : '#6b7280' }}>
              {result.isWorkPermit === true ? '✓ Yes' : result.isWorkPermit === false ? '✗ No' : '— Unknown'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>Valid Until</p>
            <p className="text-sm font-semibold text-gray-800">{result.validUntil}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>Days Remaining</p>
            <p className="text-sm font-semibold" style={{ color: isExpired ? '#dc2626' : '#1a1f3c' }}>{result.daysRemaining}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>Confidence</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full" style={{ background: '#f3f4f6' }}>
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${result.confidence}%`, background: result.confidence >= 80 ? '#16a34a' : result.confidence >= 50 ? '#d97706' : '#dc2626' }} />
              </div>
              <span className="text-sm font-semibold text-gray-800">{result.confidence}%</span>
            </div>
          </div>
        </div>
        <div className="pt-4" style={{ borderTop: '1px solid #f3f4f6' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>Work Authorization</p>
          <p className="text-sm text-gray-700">{result.workAuthorization}</p>
        </div>
        {result.note && (
          <div className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.2)' }}>
            <AlertTriangle size={13} color="#d97706" className="mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-800">{result.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkPermitAgent({ systemPrompt }: WorkPermitAgentProps) {
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [results, setResults] = useState<FileResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const SUPPORTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain'];

  const addFiles = (incoming: File[]) => {
    setError(null);
    const readers: Promise<AttachedFile>[] = incoming.map(file => {
      if (!SUPPORTED_TYPES.includes(file.type)) {
        throw new Error(`Unsupported type: "${file.name}". Use PDF, PNG, JPG or WEBP.`);
      }
      if (file.size > 15 * 1024 * 1024) throw new Error(`"${file.name}" exceeds 15 MB.`);
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, dataUrl: reader.result as string });
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers)
      .then(newFiles => setFiles(prev => {
        const names = new Set(prev.map(f => f.name));
        return [...prev, ...newFiles.filter(f => !names.has(f.name))];
      }))
      .catch(e => setError(e.message));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (name: string) => setFiles(prev => prev.filter(f => f.name !== name));

  const validate = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    setResults(null);

    const filePayloads = files.map(f => {
      const match = f.dataUrl.match(/^data:(.+);base64,(.*)$/);
      return match ? { name: f.name, mimeType: match[1], data: match[2] } : null;
    }).filter(Boolean);

    const fileNames = files.map(f => f.name);
    const userContent = `Please validate the following ${files.length} document(s): ${fileNames.join(', ')}`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userContent }],
          systemPrompt,
          files: filePayloads,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setResults(parseResults(data.content, fileNames));
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setFiles([]); setResults(null); setError(null); };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#f8f9fb' }}>
      {/* Branded header */}
      <div style={{ background: '#1a1f3c', borderBottom: '3px solid #e3000b' }}>
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded flex items-center justify-center font-black text-white text-sm" style={{ background: '#e3000b' }}>L</div>
              <div>
                <p className="text-white font-bold text-sm tracking-wide">LEISTENSCHNEIDER</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Personaldienstleistungen GmbH</p>
              </div>
            </div>
            <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <p className="text-white text-sm font-medium">Work Permit Validation</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(227,0,11,0.2)', border: '1px solid rgba(227,0,11,0.4)', color: '#fca5a5' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Powered by Orion AI
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        {!results ? (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1" style={{ color: '#1a1f3c' }}>Upload Work Permits</h2>
              <p className="text-sm text-gray-500">Upload one or more permit documents. Each will be validated individually.</p>
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              className="rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 mb-4"
              style={{
                border: `2px dashed ${dragOver ? '#e3000b' : '#d1d5db'}`,
                background: dragOver ? 'rgba(227,0,11,0.03)' : 'white',
                padding: '48px 32px',
              }}
            >
              <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileInput} accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" />
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: dragOver ? 'rgba(227,0,11,0.1)' : '#f3f4f6' }}>
                <Upload size={24} color={dragOver ? '#e3000b' : '#9ca3af'} />
              </div>
              <p className="font-semibold text-gray-700 mb-1">Drop files here or click to browse</p>
              <p className="text-xs text-gray-400">PDF, PNG, JPG, WEBP · Max 15 MB per file</p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-2 mb-6">
                {files.map(f => (
                  <div key={f.name} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                    <FileText size={16} color="#6b7280" />
                    <span className="flex-1 text-sm text-gray-700 truncate">{f.name}</span>
                    <button onClick={() => removeFile(f.name)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm mb-4" style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#b91c1c' }}>
                <AlertTriangle size={15} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={validate}
              disabled={files.length === 0 || loading}
              className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: files.length > 0 && !loading ? '#e3000b' : '#9ca3af' }}
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Validating {files.length} document{files.length > 1 ? 's' : ''}...</>
              ) : (
                <><ShieldCheck size={16} /> Validate {files.length > 0 ? `${files.length} Document${files.length > 1 ? 's' : ''}` : 'Documents'}</>
              )}
            </button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#1a1f3c' }}>Validation Results</h2>
                <p className="text-sm text-gray-500 mt-0.5">{results.length} document{results.length > 1 ? 's' : ''} analysed</p>
              </div>
              <button
                onClick={reset}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ background: 'white', border: '1px solid #e5e7eb', color: '#374151' }}
              >
                Validate more
              </button>
            </div>
            <div className="space-y-4">
              {results.map((r, i) => <ResultCard key={i} result={r} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
