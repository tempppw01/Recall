# Recall - AI 驱动的个人 GTD 系统

Recall 是一个基于 Next.js 构建的极简主义 GTD (Getting Things Done) 系统，旨在通过 AI 语义理解来革新任务管理体验。它摒弃了繁琐的手动录入，让您通过自然语言轻松管理任务，并通过语义检索找回那些“模糊的记忆”。

## 🌐 演示网站

https://recall.shuaihong.fun/

## ✨ 核心特性

*   **Magic Input (自然语言录入)**: 只需输入 "下周五下午三点提醒我给车买保险"，AI 会自动识别意图，提取标题、截止日期、优先级和标签。
*   **Recall (语义检索)**: 忘记了具体任务？只需输入 "关于车的事"，系统会通过向量相似度计算，帮您找回相关的任务，哪怕关键词完全不同。
*   **自动分类 + 智能优先级**: AI 优先判断任务分类与优先级；若结果缺失或无效，系统会根据关键词与截止日期/子任务数量进行规则兜底，确保任务更容易被筛选与排序。
*   **隐私优先 (Privacy First)**: 采用纯前端存储架构 (MVP)，所有任务数据仅保存在您的浏览器 `LocalStorage` 中，不会上传到任何服务器数据库。
*   **轻量级部署**: 无需复杂的数据库依赖，一个 Docker 容器即可运行，非常适合低配 VPS 环境。

## 🧾 更新日志

### v0.5.3

*   新增番茄时钟滴答音效，专注节奏更清晰。
*   侧边栏入口支持按数据折叠展示，移动端层级更清爽。
*   底部信息区补充项目主页、微信联系方式与版权提示。

### v0.5.1

*   新增自动分类（工作/生活/健康/学习/家庭/财务/社交），AI 优先判断，规则兜底。
*   新增智能优先级兜底：基于截止日期与子任务数量自动评估优先级。
*   任务列表与详情页展示分类标签，可手动调整分类。

## 🚧 已知问题与待办

1. ✅ 复杂自然语言解析（如“下周五下午三点提醒我给车买保险”）已完成优化。
2. 🟡 搜索功能依赖 Embedding 服务，未配置时仅走关键词兜底。
3. ⏳ 尚未接入 MySQL/云端同步，后续补充。
4. ⏳ 未加入页面登录与加密功能。
5. 🟡 子任务进阶能力仍待完善（如批量操作/提醒）。
6. 🟡 移动端 UI 持续适配优化中。
7. 🟡 AI 大模型调用稳定性待提升。
8. ⏳ 计划加入非流式调用模式。
9. ✅ 已加入 AI 一键整理当前任务清单功能。
10. ✅ 番茄时钟滴答音效已完成。

## 技术框架

*   **Frontend/Fullstack**: Next.js 14+ (App Router), React 18, TypeScript
*   **UI Framework**: Tailwind CSS, Lucide Icons
*   **AI/Vector**: OpenAI Compatible API, 本地向量检索 (Cosine Similarity)
*   **Storage**: Browser LocalStorage (MVP)
*   **PWA**: Web App Manifest + Service Worker 注册
*   **Audio**: Web Audio API (番茄时钟滴答音效)
*   **Deployment**: Docker (Alpine Linux based)

## 🚀 快速部署 (Docker Compose)

Recall 提供了官方 Docker 镜像，您可以直接使用 Docker Compose 进行一键部署。

### 1. 创建 `docker-compose.yml`

在您的服务器上创建一个名为 `docker-compose.yml` 的文件，并填入以下内容：

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

### 2. 启动服务

在 `docker-compose.yml` 所在目录下执行：

```bash
docker-compose up -d
```

服务启动后，访问 `http://your-server-ip:3789` 即可开始使用。

## ⚙️ 环境变量说明

| 变量名 | 说明 | 默认值 | 是否必须 |
| :--- | :--- | :--- | :--- |
| `OPENAI_API_KEY` | OpenAI 接口密钥 | `sk-placeholder` | **否** (建议填写以获得完整体验) |
| `OPENAI_BASE_URL` | OpenAI 接口地址 | `https://ai.shuaihong.fun/v1` | 否 |
| `EMBEDDING_PROVIDER`| 向量生成提供商 | `openai` | 否 |
| `PORT` | 容器内部端口 | `3789` | 否 |

> **注意**: `OPENAI_API_KEY` 不是必须的。如果您不填写，系统将使用默认的占位符。虽然应用可以启动，但 "Magic Input" 和 "Recall" 等依赖 AI 的功能可能无法正常工作，除非您配置的 `OPENAI_BASE_URL` 对应的服务不需要鉴权（例如某些本地运行的 LLM 代理）。

## ❓ 常见问题

1. **为什么自然语言识别失败？**
   - 复杂或含糊的语句仍可能无法准确识别，建议拆分或补充关键词。
2. **为什么搜索不可用？**
   - 搜索功能依赖 AI Embedding，目前可能受配置影响或暂未完善。
3. **是否支持数据库与登录？**
   - 目前仅前端存储，后续会接入数据库与登录/加密功能。
