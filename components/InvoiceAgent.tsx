'use client';
import { useState } from 'react';
import { FileText, AlertTriangle, Loader2, Building2, Hash, Calendar, DollarSign, ArrowRight, AlertCircle, CheckCircle2, Mail, Send, Inbox } from 'lucide-react';
import { invoiceEmails, InvoiceEmail } from '@/lib/invoice-emails';

interface InvoiceResult {
  vendor: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: string;
  department: string;
  routingReason: string;
  priority: string;
  actionRequired: string;
  note?: string;
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

function parseResult(text: string): InvoiceResult {
  const get = (key: string) => {
    const m = text.match(new RegExp(`\\*\\*${key}[:\\*]+\\s*(.+)`, 'i'));
    return m ? m[1].trim().replace(/\*+/g, '') : '—';
  };
  return {
    vendor: get('Vendor'),
    invoiceNumber: get('Invoice Number'),
    invoiceDate: get('Invoice Date'),
    totalAmount: get('Total Amount'),
    department: get('Department'),
    routingReason: get('Routing Reason'),
    priority: get('Priority'),
    actionRequired: get('Action Required'),
    note: get('Note') !== '—' ? get('Note') : undefined,
  };
}

function ResultCard({ result, email, onForward, forwarded }: {
  result: InvoiceResult;
  email: InvoiceEmail;
  onForward: () => void;
  forwarded: boolean;
}) {
  const dept = DEPARTMENTS[result.department] || { color: '#6b7280', bg: 'rgba(107,114,128,0.08)' };
  const prio = PRIORITY_STYLE[result.priority] || PRIORITY_STYLE.Medium;
  const PriorityIcon = result.priority === 'High' ? AlertCircle : result.priority === 'Low' ? CheckCircle2 : AlertTriangle;
  const deptEmail = DEPARTMENT_EMAILS[result.department];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e5e7eb', background: 'white', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ background: '#1a3d1f', borderBottom: '3px solid #f47920' }}>
        <div className="flex items-center gap-3 min-w-0">
          <Mail size={15} color="rgba(255,255,255,0.6)" className="flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{email.from}</p>
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{email.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: dept.bg, color: dept.color, border: `1px solid ${dept.color}33` }}>
            <Building2 size={10} />{result.department}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: prio.bg, color: prio.color, border: `1px solid ${prio.color}33` }}>
            <PriorityIcon size={10} />{result.priority}
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-4 gap-4 mb-4 pb-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9ca3af' }}>Vendor</p>
            <p className="text-sm font-semibold text-gray-800">{result.vendor}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9ca3af' }}>Invoice #</p>
            <p className="text-sm font-semibold text-gray-800">{result.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9ca3af' }}>Amount</p>
            <p className="text-sm font-bold" style={{ color: '#1a3d1f' }}>{result.totalAmount}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9ca3af' }}>Date</p>
            <p className="text-sm text-gray-700">{result.invoiceDate}</p>
          </div>
        </div>

        <div className="rounded-xl p-3 mb-3 flex items-start gap-2.5" style={{ background: dept.bg, border: `1px solid ${dept.color}22` }}>
          <ArrowRight size={14} color={dept.color} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: dept.color }}>Routed to {result.department}</p>
            <p className="text-xs text-gray-600">{result.routingReason}</p>
          </div>
        </div>

        <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(244,121,32,0.06)', border: '1px solid rgba(244,121,32,0.2)' }}>
          <p className="text-xs font-semibold mb-0.5" style={{ color: '#f47920' }}>Action Required</p>
          <p className="text-xs text-gray-700">{result.actionRequired}</p>
        </div>

        {result.note && (
          <div className="flex items-start gap-2 rounded-xl px-3 py-2 mb-3" style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.2)' }}>
            <AlertTriangle size={12} color="#d97706" className="mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-800">{result.note}</p>
          </div>
        )}

        {deptEmail && (
          <div className="pt-3" style={{ borderTop: '1px solid #f3f4f6' }}>
            {forwarded ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.25)', color: '#16a34a' }}>
                <CheckCircle2 size={13} />
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

export default function InvoiceAgent({ systemPrompt }: InvoiceAgentProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [result, setResult] = useState<InvoiceResult | null>(null);
  const [activeEmail, setActiveEmail] = useState<InvoiceEmail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forwarded, setForwarded] = useState(false);

  const handleEmailClick = async (email: InvoiceEmail) => {
    if (processingId) return;
    setProcessingId(email.id);
    setActiveEmail(email);
    setResult(null);
    setError(null);
    setForwarded(false);

    try {
      const fileRes = await fetch(`/api/invoice-file/${email.id}`);
      const fileJson = await fileRes.json();
      if (fileJson.error) { setError(fileJson.error); return; }

      const isConvertible = fileJson.filename.endsWith('.docx') || fileJson.filename.endsWith('.xlsx') || fileJson.filename.endsWith('.csv');
      let filePayload: { name: string; mimeType: string; data?: string; text?: string };

      if (isConvertible) {
        try {
          const convRes = await fetch('/api/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: fileJson.filename, mimeType: fileJson.mimeType, data: fileJson.data }),
          });
          const convJson = await convRes.json();
          filePayload = convJson.text
            ? { name: fileJson.filename, mimeType: 'text/plain', text: convJson.text }
            : { name: fileJson.filename, mimeType: fileJson.mimeType, data: fileJson.data };
        } catch {
          filePayload = { name: fileJson.filename, mimeType: fileJson.mimeType, data: fileJson.data };
        }
      } else {
        filePayload = { name: fileJson.filename, mimeType: fileJson.mimeType, data: fileJson.data };
      }

      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Categorize this invoice from ${email.from} (${email.fromEmail}).` }],
          systemPrompt,
          files: [filePayload],
          temperature: 0.1,
        }),
      });
      const chatJson = await chatRes.json();
      if (chatJson.error) { setError(chatJson.error); return; }
      setResult(parseResult(chatJson.content));
    } catch {
      setError('Failed to process invoice. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#f8f9fb' }}>
      {/* Header */}
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

      <div className="flex-1 overflow-hidden flex">
        {/* Email list */}
        <div className="w-80 flex-shrink-0 overflow-y-auto border-r" style={{ borderColor: '#e5e7eb', background: 'white' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: '#f3f4f6' }}>
            <div className="flex items-center gap-2">
              <Inbox size={15} color="#9ca3af" />
              <p className="text-sm font-semibold" style={{ color: '#374151' }}>Finance Inbox</p>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: '#f3f4f6', color: '#6b7280' }}>{invoiceEmails.length}</span>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: '#f9fafb' }}>
            {invoiceEmails.map(email => {
              const isActive = activeEmail?.id === email.id;
              const isProcessing = processingId === email.id;
              return (
                <button
                  key={email.id}
                  onClick={() => handleEmailClick(email)}
                  disabled={!!processingId}
                  className="w-full text-left px-5 py-4 transition-all disabled:opacity-50"
                  style={{
                    background: isActive ? 'rgba(244,121,32,0.06)' : 'white',
                    borderLeft: isActive ? '3px solid #f47920' : '3px solid transparent',
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold truncate" style={{ color: '#111827' }}>{email.from}</span>
                    {isProcessing
                      ? <Loader2 size={13} color="#f47920" className="animate-spin flex-shrink-0 mt-0.5" />
                      : <span className="text-xs font-bold flex-shrink-0" style={{ color: '#1a3d1f' }}>{email.amount}</span>
                    }
                  </div>
                  <p className="text-xs truncate mb-1" style={{ color: '#374151' }}>{email.subject}</p>
                  <p className="text-xs" style={{ color: '#9ca3af' }}>{email.date}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          {!activeEmail && !result && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(244,121,32,0.08)' }}>
                <Mail size={24} color="#f47920" />
              </div>
              <p className="font-semibold mb-1" style={{ color: '#374151' }}>Select an invoice email</p>
              <p className="text-sm" style={{ color: '#9ca3af' }}>Click any email to automatically extract and route it</p>
            </div>
          )}

          {processingId && !result && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Loader2 size={32} color="#f47920" className="animate-spin mb-4" />
              <p className="font-semibold mb-1" style={{ color: '#374151' }}>Analyzing invoice…</p>
              <p className="text-sm" style={{ color: '#9ca3af' }}>Extracting data and determining department routing</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm max-w-xl" style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#b91c1c' }}>
              <AlertTriangle size={15} className="flex-shrink-0" />{error}
            </div>
          )}

          {result && activeEmail && (
            <div className="max-w-xl">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: '#1a3d1f' }}>Invoice Processed</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{activeEmail.date} · {activeEmail.fromEmail}</p>
                </div>
                <button
                  onClick={() => { setResult(null); setActiveEmail(null); setError(null); setForwarded(false); }}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: 'white', border: '1px solid #e5e7eb', color: '#6b7280' }}
                >
                  Clear
                </button>
              </div>
              <ResultCard
                result={result}
                email={activeEmail}
                forwarded={forwarded}
                onForward={() => setForwarded(true)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
