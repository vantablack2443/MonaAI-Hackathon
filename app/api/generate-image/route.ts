import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return NextResponse.json({ error: 'API key not configured' }, { status: 400 });
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      // If model still not found, surface available image-capable models to help debugging
      if (res.status === 404) {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const listData = await listRes.json();
        const imageModels = (listData.models || [])
          .filter((m: { name: string; supportedGenerationMethods?: string[] }) =>
            m.name.toLowerCase().includes('image') || m.name.toLowerCase().includes('imagen')
          )
          .map((m: { name: string }) => m.name);
        return NextResponse.json({
          error: `Model not found. Image-capable models on your key: ${imageModels.length > 0 ? imageModels.join(', ') : 'none found — check API tier'}`,
        }, { status: 404 });
      }
      return NextResponse.json({ error: errText }, { status: res.status });
    }

    const data = await res.json();
    const part = data?.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data: string } }) => p.inlineData?.data
    );
    if (!part) return NextResponse.json({ error: 'No image in response' }, { status: 500 });

    return NextResponse.json({ image: part.inlineData.data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
