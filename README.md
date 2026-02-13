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


## 🆕 近期更新（v1.0.1）

本次版本聚焦工程稳定性与发布体验，重点包含：

- 项目版本升级至 **1.0.1**（应用内与包版本保持一致）
- GitHub 项目说明重写与润色，信息层次更清晰
- 项目介绍文案优化，保持“轻量不轻浮”的产品表达
- 移除构建缓存相关产物，减少发布过程中的历史干扰
- Docker Hub 发布链路更新，统一推送到 `34v0wphix/recall`

> 该版本为 `v1.0.0` 后的稳定性与发布维护更新。

---

## ✨ 核心能力

- **自然语言录入**：如“明天下午三点提醒我开会”
- **任务管理完整闭环**：创建、完成、筛选、排序、标签、清单、子任务
- **习惯打卡 + 倒数日**：覆盖高频个人效率场景
- **AI 助手（Todo Agent）**：辅助拆解任务与整理行动清单
- **本地优先存储**：默认 LocalStorage，可离线/低依赖使用
- **可选远程能力**：Redis / PostgreSQL / WebDAV 按需接入
- **PWA 支持**：可安装、可缓存、可通知

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

```yaml
version: '3.8'

services:
  app:
    image: 34v0wphix/recall:latest
    container_name: recall_app
    restart: always
    ports:
      - "3789:3789"
```

```bash
docker compose up -d
```

---

## ⚙️ 环境变量（可选）

| 变量名 | 说明 | 默认值 |
|---|---|---|
| `OPENAI_API_KEY` | AI 接口密钥 | - |
| `OPENAI_BASE_URL` | AI 接口地址 | `https://ai.shuaihong.fun/v1` |
| `EMBEDDING_PROVIDER` | 向量提供商（`openai` / `local`） | `openai` |
| `REDIS_HOST` | Redis 主机 | - |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `REDIS_DB` | Redis 数据库编号 | `0` |
| `REDIS_PASSWORD` | Redis 密码 | - |

> 以上均为可选；不配置时，项目依然可以以本地模式运行。

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
