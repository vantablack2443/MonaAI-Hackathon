'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, AlertCircle } from 'lucide-react';
import { Agent } from '@/lib/agents';
import MessageBubble from './MessageBubble';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatAreaProps {
  agent: Agent;
}

export default function ChatArea({ agent }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [attachedFileContent, setAttachedFileContent] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages([]);
    setInput('');
    setError(null);
    setAttachedFileName(null);
    setAttachedFileContent(null);
  }, [agent.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFileContent(reader.result as string);
      setAttachedFileName(file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text && !attachedFileName) return;
    setError(null);

    let userContent = text;
    if (attachedFileName) {
      userContent = `[Attached file: ${attachedFileName}]\n\n${text || 'Please analyze this document.'}`;
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: userContent }];
    setMessages(newMessages);
    setInput('');
    setAttachedFileName(null);
    setAttachedFileContent(null);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, systemPrompt: agent.systemPrompt }),
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
      <div className="px-6 py-4 border-b border-gray-700 bg-gray-900 flex-shrink-0">
        <h2 className="text-white font-semibold">{agent.name}</h2>
        <p className="text-gray-400 text-sm">{agent.company} · {agent.tagline}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">{agent.name}</h3>
            <p className="text-gray-400 text-sm max-w-sm">{agent.tagline} for {agent.company}. How can I help you today?</p>
            {agent.supportsFileUpload && (
              <p className="text-gray-500 text-xs mt-3">You can attach files using the paperclip icon below.</p>
            )}
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {loading && (
          <div className="flex justify-start mb-6">
            <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm mb-4">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-6 py-4 border-t border-gray-700 bg-gray-900 flex-shrink-0">
        {attachedFileName && (
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 mb-3 w-fit">
            <Paperclip size={14} className="text-blue-400" />
            <span className="text-sm text-gray-300 truncate max-w-xs">{attachedFileName}</span>
            <button
              onClick={() => { setAttachedFileName(null); setAttachedFileContent(null); }}
              className="text-gray-500 hover:text-white ml-1"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-3 bg-gray-800 rounded-2xl px-4 py-3 border border-gray-700 focus-within:border-blue-500 transition-colors">
          {agent.supportsFileUpload && (
            <>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={handleFile}
                accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="text-gray-500 hover:text-gray-300 flex-shrink-0 pb-0.5 transition-colors"
              >
                <Paperclip size={18} />
              </button>
            </>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agent.name}...`}
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-gray-500 resize-none outline-none text-sm leading-relaxed max-h-32 overflow-y-auto"
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 128) + 'px';
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || (!input.trim() && !attachedFileName)}
            className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-gray-600 text-xs text-center mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
