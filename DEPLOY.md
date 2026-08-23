# 老凤祥督导巡店系统 - Vercel 部署指南

## 部署前准备

### 1. 注册 Vercel 账号
- 访问 https://vercel.com
- 使用 GitHub 账号登录（推荐）

### 2. 准备环境变量
在 Vercel 项目设置中需要配置以下环境变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `COZE_SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` |
| `COZE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | `eyJhbG...` |
| `COZE_SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色密钥 | `eyJhbG...` |
| `COZE_BUCKET_ENDPOINT_URL` | S3 存储端点 | `https://s3.xxx.com` |
| `COZE_BUCKET_NAME` | 存储桶名称 | `lfx-inspection` |
| `COZE_BUCKET_ACCESS_KEY` | S3 访问密钥 | `AKIA...` |
| `COZE_BUCKET_SECRET_KEY` | S3 密钥 | `secret...` |
| `COZE_PROJECT_ENV` | 项目环境 | `PROD` |

## 部署步骤

### 方法一：通过 Vercel 官网部署（推荐）

1. **导入项目**
   - 登录 Vercel
   - 点击 "Add New Project"
   - 选择 "Import Git Repository"
   - 选择你的 GitHub 仓库

2. **配置构建设置**
   - Framework Preset: `Next.js`
   - Build Command: `pnpm build`
   - Output Directory: `.next`
   - Install Command: `pnpm install`

3. **添加环境变量**
   - 在 "Environment Variables" 部分添加上述所有变量

4. **点击 Deploy**
   - 等待构建完成（约2-5分钟）
   - 部署成功后会生成一个 `.vercel.app` 域名

### 方法二：通过 Vercel CLI 部署

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录 Vercel
vercel login

# 部署
vercel

# 部署到生产环境
vercel --prod
```

## 自定义域名

1. 在 Vercel 项目设置中选择 "Domains"
2. 添加你的域名（如 `lfxddz.online`）
3. 按照提示配置 DNS 解析：
   - 类型：`CNAME`
   - 名称：`@` 或 `www`
   - 值：`cname.vercel-dns.com`

## 数据库迁移

如果使用了 Supabase，确保：
1. 数据库表已创建（inspections, inspection_items）
2. 存储桶已创建并配置了正确的权限

## 注意事项

- Vercel 免费额度：每月 100GB 带宽，足够小团队使用
- Serverless Function 超时：默认 10 秒，大文件上传可能需要调整
- 环境变量修改后需要重新部署才能生效

## 故障排查

### 构建失败
- 检查 Node.js 版本（Vercel 默认使用最新 LTS）
- 检查依赖是否正确安装

### 运行时错误
- 检查环境变量是否正确配置
- 查看 Vercel 函数日志

### 照片上传失败
- 检查 S3 存储桶权限
- 检查 CORS 配置
