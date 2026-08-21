// 管理员配置
// 实际使用时应通过环境变量配置，这里作为示例
export interface Admin {
  username: string;
  password: string;
  name: string;
}

// 从环境变量读取管理员配置，如果没有则使用默认值
export const ADMINS: Admin[] = [
  {
    username: process.env.ADMIN1_USERNAME || 'admin1',
    password: process.env.ADMIN1_PASSWORD || 'lfx2026admin1',
    name: process.env.ADMIN1_NAME || '管理员1',
  },
  {
    username: process.env.ADMIN2_USERNAME || 'admin2',
    password: process.env.ADMIN2_PASSWORD || 'lfx2026admin2',
    name: process.env.ADMIN2_NAME || '管理员2',
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
