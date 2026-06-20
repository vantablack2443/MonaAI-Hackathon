'use client';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[75%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start mb-6">
      <div className="max-w-[80%] bg-gray-800 text-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </div>
  );
}
