import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BASE_URL = 'https://ai.shuaihong.fun/v1';

const buildModelsUrl = (base: string) => {
  const trimmed = base.replace(/\/$/, '');
  if (trimmed.endsWith('/models')) return trimmed;
  if (trimmed.endsWith('/v1')) return `${trimmed}/models`;
  return `${trimmed}/v1/models`;
};

const normalizeModels = (payload: any) => {
  const rawItems = Array.isArray(payload?.data) ? payload.data : [];
  return rawItems
    .map((item: any) => (typeof item?.id === 'string' ? item.id.trim() : ''))
    .filter((id: string) => id.length > 0);
};

export async function POST(req: NextRequest) {
  try {
    const { apiKey, apiBaseUrl } = await req.json();
    const baseUrl = apiBaseUrl || process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL;
    const modelsUrl = buildModelsUrl(baseUrl);

    const res = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey || process.env.OPENAI_API_KEY || 'sk-placeholder'}`,
      },
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json({ error: detail || 'Failed to fetch models' }, { status: res.status });
    }

    const data = await res.json();
    const models = normalizeModels(data);
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Model list fetch error', error);
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}