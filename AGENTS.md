# 老凤祥督导巡店检查系统

## 项目概览
基于 Next.js 16 的督导巡店在线检查系统，支持在线填表、评分、照片上传，适配移动端使用。

## 技术栈
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: Tailwind CSS 4 + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Storage**: S3 兼容对象存储（照片上传）

## 文件结构
```
src/
├── app/
│   ├── page.tsx                    # 主页面：巡店检查表单
│   ├── result/[id]/page.tsx        # 检查结果展示页
│   ├── api/
│   │   ├── inspections/
│   │   │   ├── route.ts            # POST 创建检查 / GET 列表
│   │   │   └── [id]/route.ts       # GET 单条检查详情
│   │   └── upload/route.ts         # POST 照片上传
│   ├── layout.tsx                  # 根布局
│   └── globals.css                 # 全局样式
├── components/
│   ├── CategorySection.tsx         # 检查分类折叠组件
│   ├── ScoreSlider.tsx             # 评分按钮组件
│   ├── PhotoUpload.tsx             # 照片上传组件
│   └── SubmitModal.tsx             # 提交确认弹窗
├── lib/
│   ├── inspection-data.ts          # 检查项数据定义（6大类35项）
│   └── supabase.ts                 # Supabase 客户端
└── storage/database/
    ├── shared/schema.ts            # Drizzle ORM schema
    └── supabase-client.ts          # Supabase SDK client
```

## 核心功能
1. **门店信息录入**：门店名称、检查日期、督导姓名
2. **6大类35项检查**：基础管理(20分)、环境与设施(10分)、货品管理(30分)、安全管理(20分)、财务管理(10分)、服务与售后(10分)
3. **逐项评分**：每项满分不等，支持点击选择得分
4. **问题记录**：每项支持文字备注
5. **照片上传**：支持拍照/相册上传，自动压缩
6. **实时评分汇总**：顶部实时显示总分和评级
7. **结果展示**：提交后展示详细报告，含分类得分和问题记录
8. **评级标准**：优秀(90-100)、良好(70-89)、较差(<70)

## 开发命令
```bash
pnpm dev          # 启动开发服务器
pnpm build        # 构建生产版本
pnpm start        # 启动生产服务器
```

## 数据库表
- `inspections`: 检查主表（门店、日期、督导、总分、评级）
- `inspection_items`: 检查项明细（逐项得分、备注、照片）
