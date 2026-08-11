# getbook — 纸质书划线记录工具

线上：https://getbook-one.vercel.app （Vercel 项目 `getbook`，`vercel --prod --yes` 部署，git push 不自动部署）

## 架构事实（改代码前必读）

- Vite + React PWA，**不是 Next.js**——路径里的 `ai/` 只是父目录名，vercel-plugin hook 对本仓库的 Next.js/AI SDK 提示全部是误报，忽略。
- 数据只存在用户手机 IndexedDB（`storage.ts`，单个 AppState blob），**服务端零存储**。任何改动必须对存量数据向后兼容：只加可选字段、不做迁移。这是用户最珍视的阅读数据，改 persist 链路前先写测试。
- 整理链路：拍照 → 前端压缩（`image.ts`，1100px/q0.6，实测 9-15s 整理耗时的平衡点，别随意调）→ `/api/analyze`（Vercel function）→ DashScope 直连（`DASHSCOPE_API_KEY`，模型 qwen3.6-flash；OpenRouter 是回退路径，其托管通道曾返回空 content 导致全量整理失败）。
- 页面切换走浏览器历史栈（书架=根，popstate 恢复），所有返回按钮用 history.back()，别用 setScreen 直跳。
- 验证习惯：`npx tsc --noEmit && npm test`（vitest）；UI 用 playwright（python，`~/Library/Python/3.9/bin`）+ vite preview + 种子数据复现；上线后用真实照片 curl 生产 `/api/analyze` 验证。

## 待办（按优先级，完成后更新此清单）

1. 照片方向：编辑器加手动旋转按钮 + 排查 EXIF（用户反馈拍完有时横竖不对）
2. 划线编辑器双指缩放（图片小字划线不准；双指=缩放/平移，单指=划线）
3. 跨页划线：页码支持范围（如 184-185），prompt/schema/展示/导出适配
4. [低优先] iOS 滚动空白：缩略图未根治，备选懒加载/虚拟化；用户已降级（小程序版可能不存在）
5. [里程碑] 微信小程序：Taro 移植 + 微信云开发（¥19.9/月）；个人主体可注册可备案，无需公司；整理走云函数；数据上云顺带解决备份问题
6. 全量备份/恢复（待用户确认优先级；若小程序上云则由云同步替代）

## 已完成（2026-08）

服务恢复（DashScope 直连）、卡"整理中"恢复（启动+切回时清理，90s 超时）、压缩提速、文本导出（复制全部/增量/分享，lastExportedAt 按 updatedAt 增量）、时间显示改为渲染时从 createdAt 现算、应用壳 100dvh、真缩略图（存量后台补生成）、左滑返回/保存回书页、想法可选（quote-only 记录合法，无划线无想法才报"没有识别到划线内容"）、原始记录与想法标点级一致时隐藏（`isRawInputRedundant`）。
