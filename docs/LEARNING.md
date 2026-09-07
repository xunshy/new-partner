# 学习路线

## 1. 跟踪一次生成

先读 packages/shared/src/index.ts 的 createPartnerSchema，再读 apps/api/src/generator.ts，最后看 apps/web/src/App.vue 的 generate()。

点击 → Vue 收集偏好 → POST → Hono → Zod 校验 → 生成角色 → SQLite → JSON → Vue 更新 → Motion 动画。

练习：新增一种性格和词库，解释为什么只修改前端不够。

## 2. 类型与运行时校验

TypeScript 检查开发时的代码，外部仍能发送任意请求。Zod 在运行时拒绝错误参数。共享包减少枚举漂移，但不自动证明业务正确。

练习：提交超过十二个字符的名字，观察 HTTP 400。

## 3. 会话和持久化

Cookie 会话对应所有者，所有对象操作都匹配所有者，SQL 使用参数绑定。角色属性存 JSON，事件使用独立表和外键。若要新增排行榜，应把排序字段提升为有索引的独立列，并引入版本化迁移。

练习：无痕窗口应看不到普通窗口的收藏，阅读 app.test.ts 的隔离测试。

## 4. 互动一致性

冷却以服务端事件时间为准，前端倒计时只负责展示。好感度和事件在同一事务更新。本版本为单进程、同步 SQLite；扩展到多进程时应把冷却读取和更新一起纳入事务并处理锁等待。

练习：连续互动两次，第二次应返回 429。

## 5. 页面工程

ref/reactive 管理状态，computed 处理搜索与倒计时。Button 采用 shadcn-vue 的 Reka UI + CVA + Tailwind 模式，Motion 实现动画，DiceBear 生成头像，Canvas 导出名片。

练习：理解数据流后，将结果拆成 PartnerResult.vue，用 props 和 emit 通信。

## 简历示例

理解并能独立演示后再使用，不要填写未测量的用户数或性能百分比。

**new 对象｜虚拟角色生成与互动应用**

- 基于 pnpm workspace 构建 Vue 3 + Hono 全栈应用，使用共享 TypeScript 类型和 Zod schema 统一请求约束。
- 实现随机生成、收藏管理、好感度互动和 PNG 名片导出，使用 SQLite 持久化数据，通过事务与服务端冷却规则维护互动一致性。
- 使用 TailwindCSS、Reka UI/shadcn-vue 组件模式和 Motion 实现响应式交互，补充会话隔离、输入校验和级联删除测试，提供 Nginx 部署配置。

实际部署成功后才能写“完成 Nginx 部署”。面试前要能解释：为什么 TypeScript 不能替代 Zod？清除 Cookie 会怎样？为什么冷却不能只做在前端？事务解决什么问题？何时换 PostgreSQL？
