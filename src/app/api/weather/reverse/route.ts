import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat'));
  const lon = Number(searchParams.get('lon'));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: '参数不完整' }, { status: 400 });
  }

  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/reverse');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('language', 'zh');
    url.searchParams.set('format', 'json');

    const res = await fetch(url.toString(), { next: { revalidate: 60 * 30 } });
    if (!res.ok) throw new Error(`open-meteo reverse failed: ${res.status}`);
    const data = await res.json();
    const item = Array.isArray(data?.results) ? data.results[0] : null;
    if (!item) throw new Error('未找到城市信息');

    return NextResponse.json({
      city: {
        id: `openmeteo:${item.latitude},${item.longitude}`,
        name: item.name || '当前位置',
        admin1: item.admin1,
        country: item.country,
        latitude: item.latitude,
        longitude: item.longitude,
        timezone: item.timezone,
      },
      provider: 'open-meteo',
    });
  } catch (error) {
    return NextResponse.json(
      {
        city: {
          id: `local:${lat},${lon}`,
          name: '当前位置',
          latitude: lat,
          longitude: lon,
        },
        provider: 'local-fallback',
        warning: String((error as Error)?.message || error),
      },
      { status: 200 },
    );
  }
}
