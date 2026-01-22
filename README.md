# Recall - AI 驱动的个人 GTD 系统

Recall 是一个基于 Next.js 构建的极简主义 GTD (Getting Things Done) 系统，旨在通过 AI 语义理解来革新任务管理体验。它摒弃了繁琐的手动录入，让您通过自然语言轻松管理任务，并通过语义检索找回那些“模糊的记忆”。

## ✨ 核心特性

*   **Magic Input (自然语言录入)**: 只需输入 "下周五下午三点提醒我给车买保险"，AI 会自动识别意图，提取标题、截止日期、优先级和标签。
*   **Recall (语义检索)**: 忘记了具体任务？只需输入 "关于车的事"，系统会通过向量相似度计算，帮您找回相关的任务，哪怕关键词完全不同。
*   **隐私优先 (Privacy First)**: 采用纯前端存储架构 (MVP)，所有任务数据仅保存在您的浏览器 `LocalStorage` 中，不会上传到任何服务器数据库。
*   **轻量级部署**: 无需复杂的数据库依赖，一个 Docker 容器即可运行，非常适合低配 VPS 环境。

## 🛠️ 技术栈

*   **Frontend/Fullstack**: Next.js 14+ (App Router), TypeScript
*   **UI Framework**: Tailwind CSS, ShadcnUI
*   **AI/Vector**: OpenAI Compatible API, Local Vector Search (Cosine Similarity)
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
    environment:
      # [可选] OpenAI API Key
      # 如果不填，将使用默认的占位符，可能无法使用 AI 功能，或者您可以配置自己的 Base URL 使用免费/兼容的接口
      - OPENAI_API_KEY=your_api_key_here
      
      # [可选] OpenAI Base URL
      # 默认为 https://ai.shuaihong.fun/v1，您也可以修改为官方 api.openai.com 或其他兼容接口
      - OPENAI_BASE_URL=https://ai.shuaihong.fun/v1
      
      # [可选] Embedding Provider
      # 默认为 'openai'。如果设置为 'local'，将尝试使用本地 transformers.js (需更多内存)
      - EMBEDDING_PROVIDER=openai
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

## 📦 开发指南

1.  克隆仓库:
    ```bash
    git clone https://github.com/your-repo/recall.git
    cd recall
    ```

2.  安装依赖:
    ```bash
    npm install
    ```

3.  运行开发服务器:
    ```bashwQ57Fw8xKHfSpFn178
    npm run dev
    ```

4.  构建 Docker 镜像:
    ```bash
    docker build -t recall:latest .
    ```
