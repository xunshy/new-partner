# 赛博心动 · 男友／女友生成器

抽取虚拟男友、女友或好搭子，查看稀有度，收藏角色、互动提升好感度并导出 PNG 名片。全站生成总数和 SSR / SR / R 数量由数据库累计。角色由规则词库生成，不调用大模型。

## 本地运行

需要 Node.js 24+ 与 pnpm 11。未配置云数据库时，开发环境自动使用 `apps/api/data/partners.db`。

```powershell
pnpm install
pnpm dev
```

打开 http://127.0.0.1:5173 。API 默认使用 3000 端口，由 Vite 代理。验证命令：

```powershell
pnpm typecheck
pnpm test
pnpm build
```

## 抽取与统计

- SSR：8%，命定心动
- SR：27%，特别频率
- R：65%，日常浪漫

每次抽取独立，不收费且无保底。成功生成角色后会更新全站计数。替换未收藏预览或删除收藏不会减少历史生成数。首次升级旧数据库时，各稀有度初始数量按数据库中仍保留的角色统计。

HttpOnly Cookie 用来区分匿名访客。清除 Cookie 或更换浏览器后无法找回旧收藏；当前没有账号和跨设备同步。生成间隔一秒，互动间隔十秒，均由服务端校验。

## 从 GitHub 部署到 Vercel

项目根目录已包含 `vercel.json` 和 `api/index.ts`，可以直接由 Vercel 导入。Vercel 的本地磁盘不会持久保存数据，因此线上必须连接 Turso。

1. 在 [Turso](https://turso.tech/) 创建数据库，取得数据库 URL 和认证 Token。
2. 将整个项目推送到 GitHub；不要提交 `.env`、数据库文件或 Token。
3. 在 [Vercel](https://vercel.com/new) 选择 **Import Git Repository**，导入该仓库。
4. 保持 Root Directory 为仓库根目录。构建命令、输出目录和 API 路由会从 `vercel.json` 读取。
5. 在 Vercel 项目的 Environment Variables 中添加 `TURSO_DATABASE_URL` 和 `TURSO_AUTH_TOKEN`，同时勾选 Production、Preview、Development。
6. 点击 Deploy。完成后访问 `/api/health` 应返回 `{"status":"ok"}`，再抽取一次并刷新页面确认全站总数增加。

`PUBLIC_ORIGIN` 是可选项。设置后只允许该完整来源执行写操作，适合固定的正式域名；如果需要使用 Vercel 的 Preview URL，请留空，否则预览部署会因来源不匹配而拒绝生成。

环境变量样例见 `.env.example`。更改 GitHub 默认分支后，Vercel 会自动重新构建部署。

## 项目结构

- `apps/web`：Vue 3、Tailwind CSS、Motion for Vue，包含生成、抽取动画、收藏与互动界面。
- `apps/api`：Hono、LibSQL / SQLite、生成逻辑、全站统计与测试。
- `packages/shared`：共享校验、数据类型和稀有度概率。
- `api/index.ts`：Vercel Serverless API 入口。
- `vercel.json`：Vercel 构建、静态页面和 API 路由配置。
- `deploy/nginx.conf`：传统 Linux + Nginx 部署示例。

头像由 DiceBear Bottts Neutral 在浏览器本地生成。Bottts Neutral 风格使用 CC0 许可，发布时请保留依赖许可证。
