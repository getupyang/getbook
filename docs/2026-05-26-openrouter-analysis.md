## 2026-05-26 · OpenRouter OCR and AI Analysis

- 记录时间：2026-05-26 23:45 Asia/Shanghai
- 关联 commit：7403b6c734823c3e381133dd1c4dd45a12fc413e
- 分支：main
- 改了什么：新增 Vercel API route `/api/analyze`，用 OpenRouter vision model 从压缩后的书页照片和读者输入中整理 `quote`、`thought`、`page`；前端保存后自动进入整理流程，失败时保留本地原始记录并允许重试。
- 涉及文件：`api/analyze.ts`、`src/app/App.tsx`、`src/app/analysis.ts`、`src/app/analysis.test.ts`、`.env.example`、`vercel.json`、`README.md`、`tsconfig.json`、`.gitignore`
- 为什么改：iPhone 不能依赖 Mac localhost，需要后续部署到 Vercel；AI key 必须留在 server side，不能进入前端 bundle 或 GitHub。
- 用户如何验收：在 Vercel 项目环境变量中设置 `OPENROUTER_API_KEY` 和 `OPENROUTER_MODEL`，部署后用 iPhone 打开 Vercel URL，新增一本书，拍照并输入想法；预期记录先保存，再从“整理中”变成“已整理”，详情页显示划线句、我的想法和页码。
- 已验证：`npm test`、`npm run typecheck`、`npm run build`、`curl -I http://127.0.0.1:5173/`
- 未验证：未使用真实 OpenRouter key 发起 OCR 请求；真实效果需要在 Vercel 环境变量配置后用实际书页照片验收。
- 适用范围：当前是个人 V1.1，本地 IndexedDB 仍是主存储；没有账号、云同步、Supabase 或多模型评测。
- 可能过时的地方：OpenRouter model id、结构化输出支持、Vercel Functions runtime 行为、具体 OCR 质量都可能随 provider 和模型变化。
- 安全注意：真实 API key 不写入仓库；`.env.local` 被 `.gitignore` 排除，Vercel 环境变量应在 dashboard 或安全 CLI 流程中设置。

## 2026-05-26 · Vercel API Runtime Fix

- 记录时间：2026-05-26 23:58 Asia/Shanghai
- 关联 commit：待提交
- 改了什么：把 `/api/analyze` 运行时需要的结果规范化逻辑内联到 API 文件，避免 Vercel Function 在生产环境解析 `../src/app/analysis` 时出现 `ERR_MODULE_NOT_FOUND`。
- 为什么改：首次 production 部署后，首页可访问，但 `/api/analyze` 返回 `FUNCTION_INVOCATION_FAILED`；Vercel logs 显示根因是 serverless function 跨目录 import 解析失败。
- 用户如何验收：重新部署后，请求 `POST /api/analyze` 且 body 为 `{}` 时应返回应用自己的 400 JSON，而不是 Vercel 平台级 500；iPhone 端拍照记录后应能进入真实 OpenRouter 调用。
- 已验证：修复后本地跑过 `npm test`、`npm run typecheck`、`npm run build`。
- 适用范围：仅修复 Vercel Function 打包/运行时问题，不改变前端交互和数据模型。
- 可能过时的地方：如果以后把 API runtime 改成另一个框架或显式 Edge runtime，这条修复记录只作为当时 Vercel Node Function 状态参考。
