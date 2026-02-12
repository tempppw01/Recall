/**
 * 用户注册 API 路由
 *
 * POST /api/auth/register - 注册新用户
 * 使用 bcrypt 对密码进行哈希后存储
 */

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/auth/register
 * 请求体：{ name?: string, email: string, password: string }
 * 成功返回用户基本信息，邮箱已注册返回 409
 */
export async function POST(request: Request) {
  const { name, email, password } = await request.json();

  // 校验必填字段
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  // 检查邮箱是否已注册
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email already registered.' }, { status: 409 });
  }

  // 使用 bcrypt 哈希密码（salt rounds = 10）
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: name ?? null,
      email,
      passwordHash,
    },
  });

  return NextResponse.json({ id: user.id, email: user.email, name: user.name });
}
