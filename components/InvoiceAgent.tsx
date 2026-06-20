'use client';
import { useState, useRef } from 'react';
import { Upload, X, FileText, AlertTriangle, Loader2, Send, Building2, Hash, Calendar, DollarSign, Tag, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface InvoiceResult {
  name: string;
  vendor: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: string;
  lineItems: string;
  department: string;
  routingReason: string;
  priority: 'High' | 'Medium' | 'Low' | string;
  actionRequired: string;
  note?: string;
}

interface AttachedFile {
  name: string;
  dataUrl: string;
}

interface InvoiceAgentProps {
  systemPrompt: string;
}

const DEPARTMENTS: Record<string, { color: string; bg: string }> = {
  IT:          { color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
  HR:          { color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
  Operations:  { color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
  Finance:     { color: '#059669', bg: 'rgba(5,150,105,0.08)' },
  Marketing:   { color: '#db2777', bg: 'rgba(219,39,119,0.08)' },
  Legal:       { color: '#64748b', bg: 'rgba(100,116,139,0.08)' },
  Facilities:  { color: '#ea580c', bg: 'rgba(234,88,12,0.08)' },
};

const PRIORITY_STYLE: Record<string, { color: string; bg: string }> = {
  High:   { color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  Medium: { color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
  Low:    { color: '#16a34a', bg: 'rgba(22,163,74,0.08)' },
};

function parseInvoices(text: string, fileNames: string[]): InvoiceResult[] {
  const get = (block: string, key: string) => {
    const match = block.match(new RegExp(`\\*\\*${key}[:\\*]+\\s*(.+)`, 'i'));
    return match ? match[1].trim().replace(/\*+/g, '') : '—';
  };

  const parseBlock = (block: string, fallback: string): InvoiceResult => {
    const nameMatch = block.match(/^([^\n*]+)/);
    const rawName = nameMatch ? nameMatch[1].replace(/\*+/g, '').trim() : fallback;
    const displayName = rawName.length > 3 ? rawName : fallback;

    const priority = get(block, 'Priority');
    return {
      name: displayName,
      vendor: get(block, 'Vendor'),
      invoiceNumber: get(block, 'Invoice Number'),
      invoiceDate: get(block, 'Invoice Date'),
      dueDate: get(block, 'Due Date'),
      totalAmount: get(block, 'Total Amount'),
      lineItems: get(block, 'Line Items'),
      department: get(block, 'Department'),
      routingReason: get(block, 'Routing Reason'),
      priority,
      actionRequired: get(block, 'Action Required'),
      note: get(block, 'Note') !== '—' ? get(block, 'Note') : undefined,
    };
  };

  const blocks = text.split(/\*\*Invoice\s+\d+/i).filter(s => s.trim().length > 0);
  if (blocks.length <= 1) return [parseBlock(text, fileNames[0] || 'Invoice')];
  return blocks.map((b, i) => parseBlock(b, fileNames[i] || `Invoice ${i + 1}`));
}

function InvoiceCard({ result }: { result: InvoiceResult }) {
  const dept = DEPARTMENTS[result.department] || { color: '#6b7280', bg: 'rgba(107,114,128,0.08)' };
  const prio = PRIORITY_STYLE[result.priority] || PRIORITY_STYLE.Medium;
  const PriorityIcon = result.priority === 'High' ? AlertCircle : result.priority === 'Low' ? CheckCircle2 : AlertTriangle;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e5e7eb', background: 'white', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      {/* Card header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ background: '#1a3d1f', borderBottom: '3px solid #f47920' }}>
        <div className="flex items-center gap-3">
          <FileText size={16} color="rgba(255,255,255,0.7)" />
          <span className="text-white font-medium text-sm truncate max-w-[220px]">{result.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: dept.bg, color: dept.color, border: `1px solid ${dept.color}33` }}>
            <Building2 size={11} />
            {result.department}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: prio.bg, color: prio.color, border: `1px solid ${prio.color}33` }}>
            <PriorityIcon size={11} />
            {result.priority}
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-5">
        {/* Top grid */}
        <div className="grid grid-cols-3 gap-4 mb-4 pb-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
          <div className="flex items-start gap-2">
            <Building2 size={14} color="#9ca3af" className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9ca3af' }}>Vendor</p>
              <p className="text-sm font-semibold text-gray-800">{result.vendor}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Hash size={14} color="#9ca3af" className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9ca3af' }}>Invoice #</p>
              <p className="text-sm font-semibold text-gray-800">{result.invoiceNumber}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <DollarSign size={14} color="#9ca3af" className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9ca3af' }}>Amount</p>
              <p className="text-sm font-bold" style={{ color: '#1a3d1f' }}>{result.totalAmount}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar size={14} color="#9ca3af" className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9ca3af' }}>Invoice Date</p>
              <p className="text-sm text-gray-700">{result.invoiceDate}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar size={14} color="#9ca3af" className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9ca3af' }}>Due Date</p>
              <p className="text-sm text-gray-700">{result.dueDate}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Tag size={14} color="#9ca3af" className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9ca3af' }}>Items</p>
              <p className="text-sm text-gray-700">{result.lineItems}</p>
            </div>
          </div>
        </div>

        {/* Routing */}
        <div className="rounded-xl p-3 mb-3 flex items-start gap-3" style={{ background: `${dept.bg}`, border: `1px solid ${dept.color}22` }}>
          <ArrowRight size={15} color={dept.color} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: dept.color }}>Routed to {result.department}</p>
            <p className="text-xs text-gray-600">{result.routingReason}</p>
          </div>
        </div>

        {/* Action */}
        <div className="rounded-xl p-3" style={{ background: 'rgba(244,121,32,0.06)', border: '1px solid rgba(244,121,32,0.2)' }}>
          <p className="text-xs font-semibold mb-0.5" style={{ color: '#f47920' }}>Action Required</p>
          <p className="text-xs text-gray-700">{result.actionRequired}</p>
        </div>

        {result.note && (
          <div className="mt-3 flex items-start gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.2)' }}>
            <AlertTriangle size={13} color="#d97706" className="mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-800">{result.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const SUPPORTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain'];

export default function InvoiceAgent({ systemPrompt }: InvoiceAgentProps) {
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [results, setResults] = useState<InvoiceResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: File[]) => {
    setError(null);
    const readers: Promise<AttachedFile>[] = incoming.map(file => {
      if (!SUPPORTED_TYPES.includes(file.type)) throw new Error(`Unsupported type: "${file.name}".`);
      if (file.size > 15 * 1024 * 1024) throw new Error(`"${file.name}" exceeds 15 MB.`);
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, dataUrl: reader.result as string });
        reader.readAsDataURL(file);
      });
    });
    Promise.all(readers)
      .then(nf => setFiles(prev => {
        const names = new Set(prev.map(f => f.name));
        return [...prev, ...nf.filter(f => !names.has(f.name))];
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

  const process = async () => {
    if (files.length === 0 && !manualInput.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);

    const filePayloads = files.map(f => {
      const match = f.dataUrl.match(/^data:(.+);base64,(.*)$/);
      return match ? { name: f.name, mimeType: match[1], data: match[2] } : null;
    }).filter(Boolean);

    const fileNames = files.length > 0 ? files.map(f => f.name) : ['manual-entry'];
    const userContent = files.length > 0
      ? `Process the following ${files.length} invoice(s): ${fileNames.join(', ')}. ${manualInput}`
      : manualInput;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: userContent }], systemPrompt, files: filePayloads }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setResults(parseInvoices(data.content, fileNames));
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setFiles([]); setResults(null); setError(null); setManualInput(''); };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#f8f9fb' }}>
      {/* Branded header */}
      <div style={{ background: '#1a3d1f', borderBottom: '3px solid #f47920' }}>
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-xs" style={{ background: '#f47920' }}>G</div>
              <div>
                <p className="text-white font-bold text-sm tracking-wide">GLOBUS</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Gruppe · Finance</p>
              </div>
            </div>
            <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <p className="text-white text-sm font-medium">Invoice Processing</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(244,121,32,0.2)', border: '1px solid rgba(244,121,32,0.4)', color: '#fcd5aa' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#f47920' }} />
            Powered by Orion AI
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        {!results ? (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1" style={{ color: '#1a3d1f' }}>Process Invoices</h2>
              <p className="text-sm text-gray-500">Upload invoice documents or paste invoice details. Each invoice is categorized and routed automatically.</p>
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              className="rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 mb-4"
              style={{ border: `2px dashed ${dragOver ? '#f47920' : '#d1d5db'}`, background: dragOver ? 'rgba(244,121,32,0.03)' : 'white', padding: '40px 32px' }}
            >
              <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileInput} accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" />
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: dragOver ? 'rgba(244,121,32,0.1)' : '#f3f4f6' }}>
                <Upload size={22} color={dragOver ? '#f47920' : '#9ca3af'} />
              </div>
              <p className="font-semibold text-gray-700 mb-1 text-sm">Drop invoices here or click to browse</p>
              <p className="text-xs text-gray-400">PDF, PNG, JPG, WEBP · Max 15 MB per file</p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-2 mb-4">
                {files.map(f => (
                  <div key={f.name} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                    <FileText size={15} color="#6b7280" />
                    <span className="flex-1 text-sm text-gray-700 truncate">{f.name}</span>
                    <button onClick={() => setFiles(p => p.filter(x => x.name !== f.name))} className="text-gray-400 hover:text-red-500 transition-colors"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Manual input */}
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#9ca3af' }}>Or paste invoice details</p>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb', background: 'white' }}>
                <textarea
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  placeholder="Vendor: Acme GmbH&#10;Amount: €1,240.00&#10;Date: 20.06.2026&#10;Items: Office supplies..."
                  rows={4}
                  className="w-full text-sm text-gray-700 outline-none resize-none p-4"
                  style={{ background: 'transparent' }}
                />
                {(manualInput || files.length > 0) && (
                  <div className="flex justify-end px-3 pb-3">
                    <button onClick={process} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors" style={{ background: '#f47920' }}>
                      <Send size={13} />
                      Process
                    </button>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm mb-4" style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#b91c1c' }}>
                <AlertTriangle size={15} className="flex-shrink-0" />{error}
              </div>
            )}

            {files.length > 0 && (
              <button
                onClick={process}
                disabled={loading}
                className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: '#f47920' }}
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Processing {files.length} invoice{files.length > 1 ? 's' : ''}...</>
                  : <><FileText size={16} /> Process {files.length} Invoice{files.length > 1 ? 's' : ''}</>
                }
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#1a3d1f' }}>Processing Results</h2>
                <p className="text-sm text-gray-500 mt-0.5">{results.length} invoice{results.length > 1 ? 's' : ''} processed</p>
              </div>
              <button onClick={reset} className="px-4 py-2 rounded-xl text-sm font-medium transition-colors" style={{ background: 'white', border: '1px solid #e5e7eb', color: '#374151' }}>
                Process more
              </button>
            </div>
            <div className="space-y-4">
              {results.map((r, i) => <InvoiceCard key={i} result={r} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
