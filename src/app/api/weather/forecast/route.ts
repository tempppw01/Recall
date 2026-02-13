import { NextResponse } from 'next/server';

type ForecastResult = {
  weatherCode?: number;
  tempMax?: number;
  tempMin?: number;
  weatherText?: string;
  timezone?: string;
  provider: 'open-meteo' | 'wttr' | 'none';
  warning?: string;
  errors?: string[];
};

const fetchByOpenMeteo = async (lat: number, lon: number, date: string): Promise<ForecastResult | null> => {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('daily', 'weathercode,temperature_2m_max,temperature_2m_min');
  url.searchParams.set('start_date', date);
  url.searchParams.set('end_date', date);

  const response = await fetch(url.toString(), { next: { revalidate: 60 * 10 } });
  if (!response.ok) return null;

  const data = await response.json();
  return {
    weatherCode: data?.daily?.weathercode?.[0],
    tempMax: data?.daily?.temperature_2m_max?.[0],
    tempMin: data?.daily?.temperature_2m_min?.[0],
    timezone: data?.timezone,
    provider: 'open-meteo',
  };
};

const fetchByWttr = async (lat: number, lon: number): Promise<ForecastResult | null> => {
  const response = await fetch(`https://wttr.in/${lat},${lon}?format=j1`, {
    next: { revalidate: 60 * 10 },
  });
  if (!response.ok) return null;
  const data = await response.json();
  const today = data?.weather?.[0];
  const nearest = data?.current_condition?.[0];
  if (!today && !nearest) return null;

  return {
    weatherCode: nearest?.weatherCode ? Number(nearest.weatherCode) : undefined,
    tempMax: today?.maxtempC ? Number(today.maxtempC) : undefined,
    tempMin: today?.mintempC ? Number(today.mintempC) : undefined,
    weatherText: nearest?.weatherDesc?.[0]?.value,
    provider: 'wttr',
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat'));
  const lon = Number(searchParams.get('lon'));
  const date = searchParams.get('date');

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !date) {
    return NextResponse.json({ error: '参数不完整', provider: 'none' }, { status: 400 });
  }

  const errors: string[] = [];
  try {
    const primary = await fetchByOpenMeteo(lat, lon, date);
    if (primary) {
      return NextResponse.json(primary);
    }
  } catch (error) {
    errors.push(`open-meteo: ${(error as Error).message}`);
  }

  try {
    const fallback = await fetchByWttr(lat, lon);
    if (fallback) {
      return NextResponse.json(fallback);
    }
  } catch (error) {
    errors.push(`wttr: ${(error as Error).message}`);
  }

  return NextResponse.json(
    {
      provider: 'none',
      warning: '天气服务连接受限，已自动跳过天气展示。',
      errors,
    },
    { status: 200 },
  );
}
