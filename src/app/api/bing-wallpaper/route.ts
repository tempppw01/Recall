import { NextResponse } from 'next/server';

const BING_API_URL = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1';

export async function GET() {
  try {
    const response = await fetch(BING_API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      next: { revalidate: 3600 }, // 缓存 1 小时
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch Bing wallpaper' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const image = data?.images?.[0];

    if (!image?.url) {
      return NextResponse.json(
        { error: 'No wallpaper found' },
        { status: 404 }
      );
    }

    const fullUrl = image.url.startsWith('http')
      ? image.url
      : `https://www.bing.com${image.url}`;

    return NextResponse.json({
      url: fullUrl,
      copyright: image.copyright || '',
      title: image.title || '',
    });
  } catch (error) {
    console.error('Bing wallpaper API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
