/**
 * Bing 每日壁纸代理 API
 *
 * GET /api/bing-wallpaper - 获取 Bing 每日壁纸信息
 * 通过服务端代理请求 Bing API，避免前端跨域问题
 * 响应缓存 1 小时（Next.js ISR revalidate）
 */

import { NextResponse } from 'next/server';

/** Bing 壁纸 API 地址（获取最新 1 张壁纸） */
const BING_API_URL = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1';

/** GET /api/bing-wallpaper - 返回壁纸 URL、版权信息和标题 */
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
