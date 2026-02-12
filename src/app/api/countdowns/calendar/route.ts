/**
 * 日历/黄历 API 代理路由
 *
 * GET /api/countdowns/calendar - 获取指定日期的黄历信息
 * 查询参数：year, month, day（均可选，默认为当天）
 * 代理请求第三方黄历 API，避免前端跨域
 */

import { NextRequest, NextResponse } from 'next/server';

/** 第三方黄历 API 地址 */
const ALMANAC_BASE_URL = 'https://api.tiax.cn/almanac/';

/** GET /api/countdowns/calendar?year=2024&month=1&day=15 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = searchParams.get('year') || String(now.getFullYear());
  const month = searchParams.get('month') || String(now.getMonth() + 1);
  const day = searchParams.get('day') || String(now.getDate());

  const url = new URL(ALMANAC_BASE_URL);
  url.searchParams.set('year', year);
  url.searchParams.set('month', month);
  url.searchParams.set('day', day);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }

  return NextResponse.json(data);
}
