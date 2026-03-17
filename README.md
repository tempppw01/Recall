# Recall

> 轻量 AI 待办｜专注把事做完

Recall 是一个以「**低门槛上手 + 高频真实可用**」为目标的待办清单项目。
它希望帮助你快速把想法变成行动，而不是把时间花在复杂配置和表单录入上。

---

## 🎯 项目初衷

很多待办产品“功能很全”，但也容易“越用越重”。
Recall 的初衷是：

- **轻量**：打开就能记，尽可能减少操作路径
- **不轻浮**：在核心流程上足够可靠（任务、筛选、同步、导入导出）
- **AI 不是噱头**：用于真实的自然语言录入、任务整理和回忆检索

一句话：**让你把注意力放在完成事情，而不是管理工具本身。**

---

<img width="1168" height="730" alt="截屏2026-02-13 12 40 36" src="https://github.com/user-attachments/assets/47cd9f50-391a-4243-99b7-ad8440fa2627" />
<img width="1164" height="733" alt="截屏2026-02-13 12 40 55" src="https://github.com/user-attachments/assets/7ae8d841-db94-417a-a688-96398784d4fd" />
<img width="1169" height="741" alt="截屏2026-02-13 12 41 38" src="https://github.com/user-attachments/assets/5b309f57-9365-471f-b837-6c71dba34e3c" />


## 🆕 近期更新（v0.1.1）

本次版本聚焦 UI 可见问题修复，重点包含：

- 项目版本更新为 **0.1.1**
- 修复日历视图中的城市/定位输入重复问题
- 整理一批明显 UI 错误，为后续渐进式重构铺路

> 当前版本为 `v0.1.1`，用于优先修复界面问题并继续推进重构。

---

## ✨ 核心能力

- **自然语言录入**：如“明天下午三点提醒我开会”
- **任务管理完整闭环**：创建、完成、筛选、排序、标签、清单、子任务
- **习惯打卡 + 倒数日**：覆盖高频个人效率场景
- **AI 助手（Todo Agent）**：辅助拆解任务与整理行动清单
- **AI 管理助手（Manage Agent）**：不仅会推荐任务，还支持直接在推荐卡片里一键执行建议动作（置顶 / 改优先级 / 改到今天、明天、今晚）
- **本地优先存储**：默认 LocalStorage，可离线/低依赖使用
- **可选远程能力**：Redis / PostgreSQL / WebDAV 按需接入
- **PWA 支持**：可安装、可缓存、可通知

---

## 🧠 AI 助手说明

Recall 目前有两类 AI 助手：

- **AI 记录助手（Todo Agent）**：适合把自然语言输入整理成待办、拆分行动项。
- **AI 管理助手（Manage Agent）**：适合基于当前任务列表给出优先级建议、今日推荐、逾期处理建议。

### 管理助手的直接操作

管理助手返回 recommendation 时，前端会根据字段自动显示可执行按钮：

- `suggestedPriority` → 一键改优先级
- `suggestedPinned` → 一键置顶 / 取消置顶
- `suggestedDuePreset` → 一键改到今天 / 明天 / 今晚

这些动作不会走旁路，仍然复用现有任务更新链路：
- 本地状态更新：`updateTask / quickSetPriority / quickSetDuePreset`
- 若已配置 PG 同步：会继续复用 `syncToPg('tasks', 'PUT', ...)`

也就是说，管理助手的“一键执行”只是现有任务编辑能力的快捷入口，不会引入单独的数据写入分支。

---

## 🧱 技术栈

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS + Lucide Icons
- Prisma（可选数据库）
- Redis（可选同步队列）
- WebDAV（可选附件存储）

---

## 🚀 本地开发

```bash
npm install
npm run dev
```

默认访问：`http://localhost:3000`

---

## 🐳 Docker 部署（推荐）

### 1) 使用 Docker Hub 镜像

镜像仓库：`34v0wphix/recall`

```bash
docker pull 34v0wphix/recall:latest

docker run -d \
  --name recall_app \
  -p 3789:3789 \
  --restart always \
  34v0wphix/recall:latest
```

访问：`http://<你的服务器IP>:3789`

### 2) Docker Compose 示例

#### 方案 A：使用内置 PostgreSQL（推荐本地自部署）

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    profiles: ["local-db"]
    environment:
      POSTGRES_DB: recall
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres

  app:
    image: 34v0wphix/recall:latest
    restart: always
    ports:
      - "3789:3789"
    environment:
      NEXTAUTH_URL: http://localhost:3789
      NEXTAUTH_SECRET: change-me-in-prod
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/recall
```

```bash
docker compose --profile local-db up -d
```

#### 方案 B：连接远程 PostgreSQL

```yaml
version: '3.8'

services:
  app:
    image: 34v0wphix/recall:latest
    restart: always
    ports:
      - "3789:3789"
    environment:
      NEXTAUTH_URL: http://localhost:3789
      NEXTAUTH_SECRET: change-me-in-prod
      DATABASE_URL: postgresql://USERNAME:PASSWORD@REMOTE_HOST:5432/recall
```

```bash
docker compose up -d
```

也可以不直接写完整 `DATABASE_URL`，而是用下面这些变量组合：

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`


---

## ⚙️ 环境变量（可选）

| 变量名 | 说明 | 默认值 |
|---|---|---|
| `OPENAI_API_KEY` | AI 接口密钥 | - |
| `OPENAI_BASE_URL` | AI 接口地址 | `https://ai.shuaihong.fun/v1` |
| `EMBEDDING_PROVIDER` | 向量提供商（`openai` / `local`） | `openai` |
| `NEXTAUTH_URL` | NextAuth 对外访问地址 | `http://localhost:3789` |
| `NEXTAUTH_SECRET` | NextAuth 密钥（生产必须覆盖） | `change-me-in-prod` |
| `DATABASE_URL` | 服务端数据库连接串（默认 PostgreSQL） | `postgresql://postgres:postgres@postgres:5432/recall` |
| `REDIS_HOST` | Redis 主机 | - |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `REDIS_DB` | Redis 数据库编号 | `0` |
| `REDIS_PASSWORD` | Redis 密码 | - |

> 当前默认服务端模式为 **PostgreSQL**。浏览器端仍保留 LocalStorage 体验，但 Docker / Prisma / 鉴权链路统一按 PostgreSQL 描述。

---

## 🐘 数据库初始化与动态 PG 说明

服务端持久化默认依赖 Prisma + PostgreSQL。
更详细文档见：`docs/database.md`

### 快速初始化

```bash
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/recall'
npx prisma generate
npx prisma db push
```

### 快速验证

```bash
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/recall' ./scripts/db-check.sh
```

### 动态 PG（高级模式）

Recall 仍保留基于 `x-pg-*` 请求头的动态 PG 模式，但已经收紧为：
- 默认关闭（需显式设置 `ENABLE_DYNAMIC_PG_HEADERS=true`）
- 仅在**未登录**请求时生效
- 已登录 session 始终优先走服务端数据库

建议同时配置：
- `PG_HEADERS_TOKEN`
- `PG_HEADERS_HOST_ALLOWLIST`

仅建议在自部署 / 内网 / 受信环境下使用。

---

## 🤝 贡献指南（欢迎 PR）

非常欢迎你参与贡献代码、文档和想法。

你可以通过以下方式参与：

1. 提交 Issue（Bug / 需求 / 体验建议）
2. Fork 后新建分支开发
3. 提交 PR，并附上变更说明与截图（如涉及 UI）

建议提交格式：

- `feat:` 新功能
- `fix:` 修复
- `docs:` 文档
- `refactor:` 重构
- `chore:` 构建/工程调整

如果你愿意一起把 Recall 打磨成更好用的轻量待办工具，欢迎加入。✨

---

## 🗺️ 后续规划

- 搜索/Embedding 容错与提示继续增强
- 多端同步与账号能力完善
- 移动端交互与性能优化
- AI 稳定性与可解释性提升

---

## 📄 License

MIT
