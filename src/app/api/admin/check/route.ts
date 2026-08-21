import { NextRequest, NextResponse } from 'next/server';
import { validateToken, ADMINS } from '@/lib/admin';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;

  if (!token || !validateToken(token)) {
    return NextResponse.json({ isAdmin: false });
  }

  // 从token中获取用户名
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const username = decoded.split(':')[0];
    const admin = ADMINS.find((a) => a.username === username);

    return NextResponse.json({
      isAdmin: true,
      admin: {
        username: admin?.username,
        name: admin?.name,
      },
    });
  } catch {
    return NextResponse.json({ isAdmin: false });
  }
}
