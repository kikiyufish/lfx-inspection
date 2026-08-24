# 老凤祥督导巡店系统 - Vercel 部署包

## 部署步骤

### 第一步：解压文件
```bash
tar -xzf lfx-deploy.tar.gz
cd lfx-deploy
```

### 第二步：安装依赖
```bash
pnpm install
```

### 第三步：配置环境变量
创建 `.env` 文件，添加以下内容（替换为实际值）：

```env
COZE_SUPABASE_URL=你的 Supabase 项目 URL
COZE_SUPABASE_ANON_KEY=你的 Supabase 匿名密钥
COZE_SUPABASE_SERVICE_ROLE_KEY=你的 Supabase 服务密钥
COZE_BUCKET_ENDPOINT_URL=S3 存储端点
COZE_BUCKET_NAME=存储桶名称
COZE_BUCKET_ACCESS_KEY=S3 访问密钥
COZE_BUCKET_SECRET_KEY=S3 密钥
COZE_PROJECT_ENV=PROD
```

### 第四步：部署到 Vercel

#### 方法 A：使用 Vercel CLI（推荐）
```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 部署
vercel --prod
```

#### 方法 B：通过 Vercel 网页上传
1. 访问 https://vercel.com/new
2. 点击 "Import Git Repository" 或 "Upload"
3. 上传解压后的文件夹
4. 在设置中添加环境变量
5. 点击 Deploy

### 第五步：绑定域名
1. 在 Vercel 项目设置 → Domains
2. 添加 `lfxddz.online`
3. 按提示配置 DNS 解析

## 环境变量获取

### Supabase 配置
1. 登录 https://supabase.com
2. 进入项目 → Settings → API
3. 复制 Project URL、anon public key、service_role key

### S3 存储配置
从你的对象存储服务获取对应的端点、桶名、访问密钥

## 验证部署

部署完成后访问：
- 主页：https://你的域名.vercel.app
- 历史记录：https://你的域名.vercel.app/history
- 管理员登录：https://你的域名.vercel.app/admin

管理员账号：
- admin1 / lfx2026
- admin2 / lfx2026
