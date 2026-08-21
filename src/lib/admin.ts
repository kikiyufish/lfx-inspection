// 管理员配置
export interface Admin {
  username: string;
  password: string;
  name: string;
}

export const ADMINS: Admin[] = [
  {
    username: 'admin1',
    password: 'lfx2026',
    name: '管理员1',
  },
  {
    username: 'admin2',
    password: 'lfx2026',
    name: '管理员2',
  },
];

// 验证管理员凭证
export function validateAdmin(username: string, password: string): Admin | null {
  const admin = ADMINS.find(
    (a) => a.username === username && a.password === password
  );
  return admin || null;
}

// 简单的token生成（实际生产环境应使用JWT）
export function generateToken(username: string): string {
  return Buffer.from(`${username}:${Date.now()}`).toString('base64');
}

// 验证token（简化版，实际应使用JWT验证）
export function validateToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const username = decoded.split(':')[0];
    return ADMINS.some((a) => a.username === username);
  } catch {
    return false;
  }
}
