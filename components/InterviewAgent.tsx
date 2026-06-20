'use client';
import { useState, useRef } from 'react';
import { Upload, X, FileText, Loader2, ChevronRight, Users, Wrench, Rocket, AlertTriangle, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface InterviewAgentProps {
  systemPrompt: string;
}

const ROLES = [
  {
    id: 'hiring-manager',
    title: 'Hiring Manager',
    subtitle: 'People & Talent',
    icon: Users,
    description: 'End-to-end recruiting for a fast-scaling pharma-AI company',
    tags: ['Full-time', 'Merzig / Hybrid'],
  },
  {
    id: 'gtm-engineer',
    title: 'Go-to-Market Engineer',
    subtitle: 'Sales Engineering',
    icon: Rocket,
    description: 'Bridge product and commercial — turn AI capabilities into customer value',
    tags: ['Full-time', 'Field / Remote'],
  },
  {
    id: 'fde',
    title: 'Forward Deployed Engineer',
    subtitle: 'Professional Services',
    icon: Wrench,
    description: 'Embed with enterprise customers to implement and extend AI agents',
    tags: ['Full-time', 'Customer Sites'],
  },
];

interface AttachedFile {
  name: string;
  mimeType: string;
  data?: string;
  text?: string;
}

function parseMarkdownSections(text: string) {
  return text;
}

export default function InterviewAgent({ systemPrompt }: InterviewAgentProps) {
  const [selectedRole, setSelectedRole] = useState<typeof ROLES[0] | null>(null);
  const [cvFile, setCvFile] = useState<AttachedFile | null>(null);
  const [cvText, setCvText] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    const mimeType = file.type;
    const name = file.name;

    const needsConversion =
      name.endsWith('.docx') ||
      name.endsWith('.xlsx') ||
      name.endsWith('.xls') ||
      name.endsWith('.csv');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      if (needsConversion) {
        try {
          const res = await fetch('/api/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, mimeType, data: base64 }),
          });
          const { text } = await res.json();
          setCvFile({ name, mimeType, text });
        } catch {
          setCvFile({ name, mimeType, data: base64 });
        }
      } else {
        setCvFile({ name, mimeType, data: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const generate = async () => {
    if (!selectedRole) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const roleLabel = `${selectedRole.title} (${selectedRole.subtitle})`;
    let message = `Please generate interview questions for the role: ${roleLabel}.`;
    if (cvFile || cvText.trim()) {
      message += '\n\nThe following candidate CV has been provided — tailor the questions to their specific background:';
      if (cvText.trim()) message += `\n\n${cvText}`;
    } else {
      message += ' No CV has been provided — use the generic role profile.';
    }

    const files: AttachedFile[] = [];
    if (cvFile) files.push(cvFile);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
          systemPrompt,
          files,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setResult(data.content);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setSelectedRole(null);
    setCvFile(null);
    setCvText('');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#f5f7fb' }}>
      {/* Header */}
      <div style={{ background: '#003366', borderBottom: '3px solid #0066cc' }}>
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg font-black text-white text-xs tracking-widest" style={{ background: '#0066cc', letterSpacing: '0.1em' }}>
                KP
              </div>
              <div>
                <p className="text-white font-bold text-sm tracking-wide">KOHLPHARMA GMBH</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Merzig · People & Talent</p>
              </div>
            </div>
            <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <p className="text-white text-sm font-medium">Interview Support Agent</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(0,102,204,0.25)', border: '1px solid rgba(0,102,204,0.5)', color: '#7fb3e8' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#0066cc' }} />
            Powered by Orion AI
          </div>
        </div>
      </div>

      {!result && !loading && (
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="max-w-2xl mx-auto space-y-6">

            {/* Step 1: select role */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#003366' }}>
                Step 1 — Select the open position
              </p>
              <div className="space-y-2">
                {ROLES.map((role) => {
                  const Icon = role.icon;
                  const active = selectedRole?.id === role.id;
                  return (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role)}
                      className="w-full text-left rounded-2xl p-4 transition-all"
                      style={{
                        background: active ? 'white' : 'white',
                        border: active ? '2px solid #0066cc' : '2px solid #e5e7eb',
                        boxShadow: active ? '0 0 0 3px rgba(0,102,204,0.1)' : 'none',
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: active ? '#003366' : '#f0f4fb' }}>
                          <Icon size={18} color={active ? 'white' : '#003366'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold" style={{ color: '#003366' }}>{role.title}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,51,102,0.07)', color: '#003366' }}>{role.subtitle}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                          <div className="flex gap-2 mt-1.5">
                            {role.tags.map(t => (
                              <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f0f4fb', color: '#6b7280' }}>{t}</span>
                            ))}
                          </div>
                        </div>
                        <ChevronRight size={16} color={active ? '#0066cc' : '#d1d5db'} className="flex-shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: upload CV */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#003366' }}>
                Step 2 — Candidate CV <span className="font-normal normal-case" style={{ color: '#9ca3af' }}>(optional — upload or paste)</span>
              </p>

              {cvFile ? (
                <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'white', border: '2px solid #0066cc' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,102,204,0.08)' }}>
                    <FileText size={16} color="#0066cc" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{cvFile.name}</p>
                    <p className="text-xs text-gray-400">CV attached · questions will be tailored to this candidate</p>
                  </div>
                  <button onClick={() => setCvFile(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                    <X size={14} color="#9ca3af" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-2xl p-6 text-center cursor-pointer transition-all"
                    style={{
                      background: dragOver ? 'rgba(0,102,204,0.05)' : 'white',
                      border: `2px dashed ${dragOver ? '#0066cc' : '#d1d5db'}`,
                    }}
                  >
                    <Upload size={20} className="mx-auto mb-2" color={dragOver ? '#0066cc' : '#9ca3af'} />
                    <p className="text-sm text-gray-500">Drop CV here or <span style={{ color: '#0066cc' }} className="font-medium">browse</span></p>
                    <p className="text-xs text-gray-400 mt-0.5">PDF, DOCX, TXT accepted</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.png,.jpg"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
                    />
                  </div>
                  <p className="text-xs text-center text-gray-400">— or paste CV text —</p>
                  <textarea
                    value={cvText}
                    onChange={(e) => setCvText(e.target.value)}
                    placeholder="Paste candidate's CV or relevant experience here..."
                    rows={4}
                    className="w-full rounded-2xl p-4 text-sm text-gray-700 outline-none resize-none"
                    style={{ background: 'white', border: '2px solid #e5e7eb' }}
                    onFocus={(e) => e.target.style.borderColor = '#0066cc'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#b91c1c' }}>
                <AlertTriangle size={15} />{error}
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={generate}
              disabled={!selectedRole}
              className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ background: selectedRole ? '#003366' : '#9ca3af' }}
            >
              Generate Interview Questions
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: '#003366' }} />
            <p className="text-sm font-medium" style={{ color: '#003366' }}>Preparing interview kit...</p>
            <p className="text-xs text-gray-400 mt-1">
              {cvFile || cvText ? 'Analysing CV and tailoring questions' : 'Generating role-specific questions'}
            </p>
          </div>
        </div>
      )}

      {result && (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto">
            {/* Result header */}
            <div className="rounded-2xl overflow-hidden mb-4" style={{ border: '1px solid #e5e7eb', background: 'white' }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ background: '#003366', borderBottom: '3px solid #0066cc' }}>
                <div className="flex items-center gap-3">
                  {selectedRole && <selectedRole.icon size={16} color="rgba(255,255,255,0.7)" />}
                  <span className="text-white font-semibold text-sm">{selectedRole?.title} — {selectedRole?.subtitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  {(cvFile || cvText) && (
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(0,102,204,0.3)', color: '#7fb3e8' }}>
                      CV-tailored
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Markdown result */}
            <div
              className="rounded-2xl p-6 text-sm leading-relaxed"
              style={{ background: 'white', border: '1px solid #e5e7eb' }}
            >
              <div className="prose prose-sm max-w-none" style={{ color: '#1f2937' }}>
                <ReactMarkdown
                  components={{
                    h2: ({ children }) => (
                      <h2 style={{ color: '#003366', fontSize: '0.9rem', fontWeight: 700, marginTop: '1.25rem', marginBottom: '0.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.25rem' }}>{children}</h2>
                    ),
                    strong: ({ children }) => (
                      <strong style={{ color: '#003366' }}>{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em style={{ color: '#6b7280', fontSize: '0.8rem' }}>{children}</em>
                    ),
                    li: ({ children }) => (
                      <li style={{ marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>{children}</li>
                    ),
                    p: ({ children }) => (
                      <p style={{ marginBottom: '0.75rem' }}>{children}</p>
                    ),
                    ol: ({ children }) => (
                      <ol style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>{children}</ol>
                    ),
                    ul: ({ children }) => (
                      <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>{children}</ul>
                    ),
                  }}
                >
                  {result}
                </ReactMarkdown>
              </div>
            </div>

            <button
              onClick={reset}
              className="w-full mt-4 rounded-2xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              style={{ background: 'white', border: '1px solid #e5e7eb', color: '#374151' }}
            >
              <RotateCcw size={14} />
              New Interview Kit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
