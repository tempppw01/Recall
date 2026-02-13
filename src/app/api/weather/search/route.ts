import { NextResponse } from 'next/server';

type CityResult = {
  id: string;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

const LOCAL_CITY_FALLBACK: CityResult[] = [
  { id: 'local:beijing', name: '北京', country: '中国', latitude: 39.9042, longitude: 116.4074, timezone: 'Asia/Shanghai' },
  { id: 'local:shanghai', name: '上海', country: '中国', latitude: 31.2304, longitude: 121.4737, timezone: 'Asia/Shanghai' },
  { id: 'local:guangzhou', name: '广州', country: '中国', latitude: 23.1291, longitude: 113.2644, timezone: 'Asia/Shanghai' },
  { id: 'local:shenzhen', name: '深圳', country: '中国', latitude: 22.5431, longitude: 114.0579, timezone: 'Asia/Shanghai' },
  { id: 'local:hangzhou', name: '杭州', country: '中国', latitude: 30.2741, longitude: 120.1551, timezone: 'Asia/Shanghai' },
  { id: 'local:chengdu', name: '成都', country: '中国', latitude: 30.5728, longitude: 104.0668, timezone: 'Asia/Shanghai' },
  { id: 'local:tokyo', name: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
  { id: 'local:london', name: 'London', country: 'United Kingdom', latitude: 51.5072, longitude: -0.1276, timezone: 'Europe/London' },
];

const searchByOpenMeteo = async (query: string): Promise<CityResult[]> => {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', query);
  url.searchParams.set('count', '8');
  url.searchParams.set('language', 'zh');
  url.searchParams.set('format', 'json');

  const response = await fetch(url.toString(), { next: { revalidate: 60 * 30 } });
  if (!response.ok) return [];
  const data = await response.json();
  if (!Array.isArray(data?.results)) return [];
  return data.results.map((item: any) => ({
    id: `openmeteo:${item.latitude},${item.longitude}`,
    name: item.name,
    admin1: item.admin1,
    country: item.country,
    latitude: item.latitude,
    longitude: item.longitude,
    timezone: item.timezone,
  }));
};

const searchByNominatim = async (query: string): Promise<CityResult[]> => {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '8');

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Recall-Weather-Search/1.0' },
    next: { revalidate: 60 * 30 },
  });
  if (!response.ok) return [];
  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data.map((item: any) => ({
    id: `nominatim:${item.lat},${item.lon}`,
    name: item?.address?.city || item?.address?.town || item?.address?.county || item?.name || '未知城市',
    admin1: item?.address?.state,
    country: item?.address?.country,
    latitude: Number(item.lat),
    longitude: Number(item.lon),
  })).filter((item: CityResult) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
};

const searchLocalFallback = (query: string): CityResult[] => {
  const q = query.trim().toLowerCase();
  return LOCAL_CITY_FALLBACK.filter((city) =>
    [city.name, city.admin1, city.country].filter(Boolean).some((field) => String(field).toLowerCase().includes(q)),
  ).slice(0, 8);
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], provider: 'none' });
  }

  const errors: string[] = [];
  try {
    const primary = await searchByOpenMeteo(query);
    if (primary.length > 0) {
      return NextResponse.json({ results: primary, provider: 'open-meteo' });
    }
  } catch (error) {
    errors.push(`open-meteo: ${(error as Error).message}`);
  }

  try {
    const fallback = await searchByNominatim(query);
    if (fallback.length > 0) {
      return NextResponse.json({ results: fallback, provider: 'nominatim' });
    }
  } catch (error) {
    errors.push(`nominatim: ${(error as Error).message}`);
  }

  const local = searchLocalFallback(query);
  if (local.length > 0) {
    return NextResponse.json({
      results: local,
      provider: 'local-fallback',
      warning: '天气服务网络受限，当前使用本地城市列表。',
      errors,
    });
  }

  return NextResponse.json({ results: [], provider: 'none', errors }, { status: 200 });
}
