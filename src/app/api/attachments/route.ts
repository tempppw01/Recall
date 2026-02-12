/**
 * 附件上传 API 路由（WebDAV）
 *
 * POST /api/attachments - 上传文件到 WebDAV 服务器
 *
 * WebDAV 配置优先级：请求表单字段 > 环境变量
 * 文件大小限制：30MB
 */

import { NextRequest, NextResponse } from 'next/server';

/** WebDAV 默认配置（从环境变量读取） */
const DEFAULT_WEBDAV_URL = process.env.WEBDAV_URL;
const DEFAULT_WEBDAV_USERNAME = process.env.WEBDAV_USERNAME;
const DEFAULT_WEBDAV_PASSWORD = process.env.WEBDAV_PASSWORD;

/** 文件大小上限：30MB */
const MAX_SIZE = 30 * 1024 * 1024;

/**
 * POST /api/attachments
 * 接收 multipart/form-data，将文件通过 HTTP PUT 上传到 WebDAV
 * 返回文件的 WebDAV URL、文件名、大小和类型
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const webdavUrl = (formData.get('webdavUrl') as string) || DEFAULT_WEBDAV_URL;
    const username = (formData.get('username') as string) || DEFAULT_WEBDAV_USERNAME;
    const password = (formData.get('password') as string) || DEFAULT_WEBDAV_PASSWORD;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 30MB)' }, { status: 400 });
    }

    if (!webdavUrl || !username || !password) {
      return NextResponse.json({ error: 'WebDAV config missing' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name}`;
    
    // 确保 URL 结尾有 /
    const baseUrl = webdavUrl.endsWith('/') ? webdavUrl : `${webdavUrl}/`;
    // 构建上传路径：Recall/Attachments/
    // WebDAV 通常需要完整的 URL 路径
    // 这里简单处理，直接上传到根目录下的 Recall-Attachments 文件夹（需自行确保文件夹存在或自动创建）
    // 为了兼容性，这里假设用户提供的 URL 已经是目标文件夹，或者直接拼接到 URL 后
    // 更好的做法是先 MKCOL 创建目录，但为简化流程，直接传文件
    const targetUrl = `${baseUrl}${encodeURIComponent(fileName)}`;

    const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: buffer,
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `WebDAV upload failed: ${response.status} ${text}` }, 
        { status: response.status }
      );
    }

    // 返回可访问的 URL（如果是公共链接）或 WebDAV 路径
    // 注意：私有 WebDAV 无法直接通过浏览器访问，前端可能需要再次通过 API 代理下载
    // 这里暂时返回 WebDAV 的完整 URL
    return NextResponse.json({ 
      url: targetUrl, 
      filename: fileName,
      size: file.size,
      type: file.type 
    });

  } catch (error) {
    console.error('Upload error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
