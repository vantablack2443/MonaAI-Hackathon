'use client';
import { useState, useRef } from 'react';
import { Upload, X, FileText, AlertTriangle, Loader2, Send, Building2, Hash, Calendar, DollarSign, Tag, ArrowRight, AlertCircle, CheckCircle2, Mail, Inbox, LogOut } from 'lucide-react';
import { invoiceEmails, InvoiceEmail } from '@/lib/invoice-emails';

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

const DEPARTMENT_EMAILS: Record<string, string> = {
  IT:         'it@globus-gruppe.de',
  HR:         'hr@globus-gruppe.de',
  Operations: 'operations@globus-gruppe.de',
  Finance:    'finance@globus-gruppe.de',
  Marketing:  'marketing@globus-gruppe.de',
  Legal:      'legal@globus-gruppe.de',
  Facilities: 'facilities@globus-gruppe.de',
};

const PRIORITY_STYLE: Record<string, { color: string; bg: string }> = {
  High:   { color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  Medium: { color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
  Low:    { color: '#16a34a', bg: 'rgba(22,163,74,0.08)' },
};

const CATEGORY_COLORS: Record<string, string> = {
  'Cloud & Software':    '#2563eb',
  'Hardware & Equipment':'#64748b',
  'Utilities':           '#059669',
  'Services & Consulting':'#7c3aed',
  'Office Supplies':     '#d97706',
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

function InvoiceCard({
  result,
  onForward,
  forwarded,
}: {
  result: InvoiceResult;
  onForward?: () => void;
  forwarded?: boolean;
}) {
  const dept = DEPARTMENTS[result.department] || { color: '#6b7280', bg: 'rgba(107,114,128,0.08)' };
  const prio = PRIORITY_STYLE[result.priority] || PRIORITY_STYLE.Medium;
  const PriorityIcon = result.priority === 'High' ? AlertCircle : result.priority === 'Low' ? CheckCircle2 : AlertTriangle;
  const deptEmail = DEPARTMENT_EMAILS[result.department];

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
        <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(244,121,32,0.06)', border: '1px solid rgba(244,121,32,0.2)' }}>
          <p className="text-xs font-semibold mb-0.5" style={{ color: '#f47920' }}>Action Required</p>
          <p className="text-xs text-gray-700">{result.actionRequired}</p>
        </div>

        {result.note && (
          <div className="mb-3 flex items-start gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.2)' }}>
            <AlertTriangle size={13} color="#d97706" className="mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-800">{result.note}</p>
          </div>
        )}

        {/* Forward action */}
        {onForward && deptEmail && (
          <div className="pt-3" style={{ borderTop: '1px solid #f3f4f6' }}>
            {forwarded ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.25)', color: '#16a34a' }}>
                <CheckCircle2 size={14} />
                Forwarded to <span className="font-semibold">{deptEmail}</span>
              </div>
            ) : (
              <button
                onClick={onForward}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold w-full justify-center transition-all"
                style={{ background: 'rgba(26,61,31,0.05)', border: '1px solid rgba(26,61,31,0.18)', color: '#1a3d1f' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(26,61,31,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(26,61,31,0.05)'; }}
              >
                <Send size={13} />
                Forward to {result.department} · <span style={{ color: '#f47920' }}>{deptEmail}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const SUPPORTED_TYPES = [
  'application/pdf',
  'image/png', 'image/jpeg', 'image/webp',
  'text/plain', 'text/csv', 'application/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];
const CONVERT_TYPES = [
  'text/csv', 'application/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

export default function InvoiceAgent({ systemPrompt }: InvoiceAgentProps) {
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [results, setResults] = useState<InvoiceResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [view, setView] = useState<'inbox' | 'upload'>('inbox');
  const [processingEmailId, setProcessingEmailId] = useState<string | null>(null);
  const [processedEmail, setProcessedEmail] = useState<InvoiceEmail | null>(null);
  const [forwarded, setForwarded] = useState<Record<number, boolean>>({});

  // Email login state
  const [emailAddress, setEmailAddress] = useState('finanz@globus-gruppe.de');
  const [emailConnected, setEmailConnected] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const groupedEmails = invoiceEmails.reduce<Record<string, InvoiceEmail[]>>((acc, email) => {
    if (!acc[email.category]) acc[email.category] = [];
    acc[email.category].push(email);
    return acc;
  }, {});

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

  const processFiles = async (targetFiles: AttachedFile[], extraContext = '') => {
    setLoading(true);
    setError(null);
    setResults(null);
    setForwarded({});

    const filePayloads: { name: string; mimeType: string; data?: string; text?: string }[] = [];
    for (const f of targetFiles) {
      const match = f.dataUrl.match(/^data:(.+);base64,(.*)$/);
      if (!match) continue;
      const [, mimeType, data] = match;
      if (CONVERT_TYPES.includes(mimeType) || f.name.endsWith('.csv') || f.name.endsWith('.docx') || f.name.endsWith('.xlsx')) {
        try {
          const res = await fetch('/api/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: f.name, mimeType, data }),
          });
          const json = await res.json();
          if (json.text) filePayloads.push({ name: f.name, mimeType: 'text/plain', text: json.text });
          else filePayloads.push({ name: f.name, mimeType, data });
        } catch {
          filePayloads.push({ name: f.name, mimeType, data });
        }
      } else {
        filePayloads.push({ name: f.name, mimeType, data });
      }
    }

    const fileNames = targetFiles.map(f => f.name);
    const userContent = `Process the following ${targetFiles.length} invoice(s): ${fileNames.join(', ')}. ${extraContext}`;

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

  const process = async () => {
    if (files.length === 0 && !manualInput.trim()) return;
    if (files.length === 0) {
      setLoading(true);
      setError(null);
      setResults(null);
      setForwarded({});
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: manualInput }], systemPrompt }),
        });
        const data = await res.json();
        if (data.error) { setError(data.error); return; }
        setResults(parseInvoices(data.content, ['manual-entry']));
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }
    await processFiles(files, manualInput);
  };

  const handleEmailClick = async (email: InvoiceEmail) => {
    setProcessingEmailId(email.id);
    setProcessedEmail(email);
    setError(null);
    try {
      const res = await fetch(`/api/invoice-file/${email.id}`);
      const json = await res.json();
      if (json.error) { setError(json.error); setProcessingEmailId(null); return; }
      const dataUrl = `data:${json.mimeType};base64,${json.data}`;
      await processFiles(
        [{ name: json.filename, dataUrl }],
        `This invoice arrived via email from ${email.from} (${email.fromEmail}), subject: "${email.subject}", received ${email.date}.`
      );
    } catch {
      setError('Failed to load invoice from email. Please try again.');
    } finally {
      setProcessingEmailId(null);
    }
  };

  const reset = () => {
    setFiles([]); setResults(null); setError(null);
    setManualInput(''); setProcessedEmail(null); setForwarded({});
  };

  const disconnect = () => {
    reset();
    setEmailConnected(false);
    setView('inbox');
  };

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!emailConnected) {
    return (
      <div className="flex flex-col h-full overflow-hidden" style={{ background: '#f8f9fb' }}>
        <div style={{ background: '#1a3d1f', borderBottom: '3px solid #f47920' }}>
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-xs" style={{ background: '#f47920' }}>G</div>
              <div>
                <p className="text-white font-bold text-sm tracking-wide">GLOBUS</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Gruppe · Finance</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(244,121,32,0.2)', border: '1px solid rgba(244,121,32,0.4)', color: '#fcd5aa' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#f47920' }} />
              Invoice Processing
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="rounded-2xl p-8" style={{ background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: '#1a3d1f' }}>
                <Mail size={24} color="white" />
              </div>
              <h2 className="text-xl font-bold text-center mb-1" style={{ color: '#1a3d1f' }}>Connect to Finance Inbox</h2>
              <p className="text-sm text-center mb-7" style={{ color: '#9ca3af' }}>Enter your Globus finance email to load invoices</p>

              <div className="mb-5">
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6b7280' }}>Email Address</label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={e => setEmailAddress(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && emailAddress.trim() && setEmailConnected(true)}
                  className="w-full rounded-xl px-4 py-3 text-sm border focus:outline-none transition-colors"
                  style={{ border: '1px solid #d1d5db', background: '#f9fafb', color: '#1f2937' }}
                  placeholder="finanz@globus-gruppe.de"
                />
                <p className="text-xs mt-1.5" style={{ color: '#d1d5db' }}>Suggested: finanz@globus-gruppe.de</p>
              </div>

              <button
                onClick={() => emailAddress.trim() && setEmailConnected(true)}
                disabled={!emailAddress.trim()}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                style={{ background: '#f47920' }}
              >
                Open Inbox
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main app (connected) ──────────────────────────────────────────────────
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
            <div className="flex items-center gap-1.5">
              <Mail size={13} color="rgba(255,255,255,0.5)" />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{emailAddress}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(244,121,32,0.2)', border: '1px solid rgba(244,121,32,0.4)', color: '#fcd5aa' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#f47920' }} />
              Powered by Orion AI
            </div>
            <button onClick={disconnect} className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }} title="Sign out">
              <LogOut size={13} />
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        {!results ? (
          <div className="max-w-2xl mx-auto">
            {/* View toggle */}
            <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: '#e5e7eb' }}>
              {(['inbox', 'upload'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={view === v ? { background: 'white', color: '#1a3d1f', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { color: '#6b7280' }}
                >
                  {v === 'inbox' ? <Inbox size={14} /> : <Upload size={14} />}
                  {v === 'inbox' ? 'Email Inbox' : 'Upload Manually'}
                </button>
              ))}
            </div>

            {/* ── Inbox view ── */}
            {view === 'inbox' && (
              <div>
                <div className="mb-5">
                  <h2 className="text-xl font-bold mb-1" style={{ color: '#1a3d1f' }}>Finance Inbox</h2>
                  <p className="text-sm text-gray-500">Click any invoice email to have the agent extract, categorize, and route it automatically.</p>
                </div>

                {Object.entries(groupedEmails).map(([category, emails]) => (
                  <div key={category} className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[category] || '#9ca3af' }} />
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>{category}</p>
                      <div className="flex-1 h-px" style={{ background: '#e5e7eb' }} />
                      <span className="text-xs" style={{ color: '#d1d5db' }}>{emails.length}</span>
                    </div>

                    <div className="space-y-2">
                      {emails.map(email => {
                        const isProcessing = processingEmailId === email.id;
                        return (
                          <button
                            key={email.id}
                            onClick={() => !processingEmailId && handleEmailClick(email)}
                            disabled={!!processingEmailId}
                            className="w-full text-left rounded-xl px-5 py-4 transition-all duration-150 disabled:opacity-60"
                            style={{ background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                            onMouseEnter={e => { if (!processingEmailId) (e.currentTarget as HTMLElement).style.borderColor = '#f47920'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(244,121,32,0.1)' }}>
                                  {isProcessing
                                    ? <Loader2 size={14} color="#f47920" className="animate-spin" />
                                    : <Mail size={14} color="#f47920" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-sm font-semibold text-gray-900 truncate">{email.from}</span>
                                    <span className="text-xs text-gray-400 flex-shrink-0">{email.date}</span>
                                  </div>
                                  <p className="text-sm text-gray-700 font-medium truncate mb-1">{email.subject}</p>
                                  <p className="text-xs text-gray-400 truncate">{email.preview}</p>
                                </div>
                              </div>
                              <div className="flex-shrink-0 text-sm font-bold" style={{ color: '#1a3d1f' }}>{email.amount}</div>
                            </div>
                            {isProcessing && (
                              <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: '#f47920' }}>
                                <Loader2 size={11} className="animate-spin" />
                                Fetching invoice and processing…
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Upload view ── */}
            {view === 'upload' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-1" style={{ color: '#1a3d1f' }}>Process Invoices</h2>
                  <p className="text-sm text-gray-500">Upload invoice documents or paste invoice details. Each invoice is categorized and routed automatically.</p>
                </div>

                <div
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileRef.current?.click()}
                  className="rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 mb-4"
                  style={{ border: `2px dashed ${dragOver ? '#f47920' : '#d1d5db'}`, background: dragOver ? 'rgba(244,121,32,0.03)' : 'white', padding: '40px 32px' }}
                >
                  <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileInput} accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.docx,.xlsx,.xls" />
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: dragOver ? 'rgba(244,121,32,0.1)' : '#f3f4f6' }}>
                    <Upload size={22} color={dragOver ? '#f47920' : '#9ca3af'} />
                  </div>
                  <p className="font-semibold text-gray-700 mb-1 text-sm">Drop invoices here or click to browse</p>
                  <p className="text-xs text-gray-400">PDF, PNG, JPG, DOCX, XLSX, CSV · Max 15 MB per file</p>
                </div>

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
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm mt-4" style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#b91c1c' }}>
                <AlertTriangle size={15} className="flex-shrink-0" />{error}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#1a3d1f' }}>Processing Results</h2>
                {processedEmail ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Mail size={12} color="#9ca3af" />
                    <p className="text-xs text-gray-400">
                      From <span className="font-medium text-gray-600">{processedEmail.fromEmail}</span> · {processedEmail.date}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-0.5">{results.length} invoice{results.length > 1 ? 's' : ''} processed</p>
                )}
              </div>
              <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors" style={{ background: 'white', border: '1px solid #e5e7eb', color: '#374151' }}>
                <Inbox size={14} />
                Back to inbox
              </button>
            </div>
            <div className="space-y-4">
              {results.map((r, i) => (
                <InvoiceCard
                  key={i}
                  result={r}
                  forwarded={!!forwarded[i]}
                  onForward={() => setForwarded(prev => ({ ...prev, [i]: true }))}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
