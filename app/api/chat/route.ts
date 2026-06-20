import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt, file } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please add your GEMINI_API_KEY to .env.local and restart the server.' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const systemWithDate = `Today's date is ${today}. Use this as the current date for all date calculations and validity checks.\n\n${systemPrompt}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemWithDate,
    });

    const history = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    const chat = model.startChat({ history });

    // If a file was attached, send its content inline so Gemini can actually read it.
    let result;
    if (file && file.data && file.mimeType) {
      result = await chat.sendMessage([
        { text: lastMessage.content },
        { inlineData: { mimeType: file.mimeType, data: file.data } },
      ]);
    } else {
      result = await chat.sendMessage(lastMessage.content);
    }

    const text = result.response.text();

    return NextResponse.json({ content: text });
  } catch (error: unknown) {
    console.error('Chat API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to get response: ${message}` }, { status: 500 });
  }
}
