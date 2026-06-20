'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, AlertCircle } from 'lucide-react';
import { Agent } from '@/lib/agents';
import MessageBubble from './MessageBubble';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AttachedFile {
  name: string;
  dataUrl: string;
}

interface ChatAreaProps {
  agent: Agent;
}

const SUPPORTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain'];

export default function ChatArea({ agent }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages([]);
    setInput('');
    setError(null);
    setAttachedFiles([]);
  }, [agent.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError(null);

    const newFiles: AttachedFile[] = [];
    let pending = files.length;

    for (const file of files) {
      if (!SUPPORTED_TYPES.includes(file.type)) {
        setError(`Unsupported file type: "${file.name}". Use PDF, image (PNG/JPG/WEBP), or text.`);
        e.target.value = '';
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setError(`"${file.name}" is too large (max 15MB).`);
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        newFiles.push({ name: file.name, dataUrl: reader.result as string });
        pending--;
        if (pending === 0) {
          setAttachedFiles(prev => [...prev, ...newFiles]);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const removeFile = (name: string) => {
    setAttachedFiles(prev => prev.filter(f => f.name !== name));
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text && attachedFiles.length === 0) return;
    setError(null);

    const fileNames = attachedFiles.map(f => f.name).join(', ');
    const userContent = attachedFiles.length > 0
      ? `[Attached: ${fileNames}]\n\n${text || 'Please analyze these documents.'}`
      : text;

    const filePayloads = attachedFiles.map(f => {
      const match = f.dataUrl.match(/^data:(.+);base64,(.*)$/);
      return match ? { name: f.name, mimeType: match[1], data: match[2] } : null;
    }).filter(Boolean) as { name: string; mimeType: string; data: string }[];

    const newMessages: Message[] = [...messages, { role: 'user', content: userContent }];
    setMessages(newMessages);
    setInput('');
    setAttachedFiles([]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, systemPrompt: agent.systemPrompt, files: filePayloads }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: data.content }]);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)' }}>
        <h2 className="text-white font-semibold text-sm">{agent.name}</h2>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{agent.company} · {agent.tagline}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 40px rgba(99,102,241,0.3)' }}
            >
              <span className="text-2xl">✦</span>
            </div>
            <h3 className="text-white font-semibold text-xl mb-2">{agent.name}</h3>
            <p className="text-sm max-w-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {agent.tagline} for {agent.company}. How can I help you today?
            </p>
            {agent.supportsFileUpload && (
              <div
                className="mt-4 px-4 py-2 rounded-full text-xs"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: 'rgba(165,180,252,0.8)' }}
              >
                Attach one or more files using the paperclip icon below
              </div>
            )}
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {loading && (
          <div className="flex justify-start mb-5">
            <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#818cf8', animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#818cf8', animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#818cf8', animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        {error && (
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm mb-4"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
          >
            <AlertCircle size={15} className="flex-shrink-0" />
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)' }}>
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachedFiles.map(f => (
              <div key={f.name} className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <Paperclip size={12} style={{ color: '#a5b4fc' }} />
                <span className="text-xs truncate max-w-[160px]" style={{ color: 'rgba(255,255,255,0.7)' }}>{f.name}</span>
                <button onClick={() => removeFile(f.name)} className="ml-1 transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div
          className="flex items-end gap-3 rounded-2xl px-4 py-3 transition-all duration-200"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}
        >
          {agent.supportsFileUpload && (
            <>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFiles} accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" />
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-shrink-0 pb-0.5 transition-colors"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'}
              >
                <Paperclip size={17} />
              </button>
            </>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agent.name}...`}
            rows={1}
            className="flex-1 resize-none outline-none text-sm leading-relaxed max-h-32 overflow-y-auto"
            style={{ background: 'transparent', color: 'white' }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 128) + 'px';
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || (!input.trim() && attachedFiles.length === 0)}
            className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Send size={13} />
          </button>
        </div>
        <p className="text-xs text-center mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
