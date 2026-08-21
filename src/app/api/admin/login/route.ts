import { NextRequest, NextResponse } from 'next/server';
import { validateAdmin, generateToken } from '@/lib/admin';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    const admin = validateAdmin(username, password);
    
    if (!admin) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const token = generateToken(username);

    // 设置cookie，有效期7天
    const response = NextResponse.json({
      success: true,
      admin: {
        username: admin.username,
        name: admin.name,
      },
    });

    // 检测是否通过HTTPS访问
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const isSecure = proto === 'https';

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
