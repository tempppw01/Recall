# Project Structure: Recall (MVP - Browser-based Storage)

```text
Recall/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/              
│   │   │   └── ai/
│   │   │       └── process/  # Stateless AI processing (Intent + Embedding)
│   │   ├── layout.tsx
│   │   └── page.tsx          # Main Dashboard (Interaction Logic)
│   ├── components/           
│   ├── lib/                  
│   │   ├── embeddings.ts     # Server-side Embedding generation
│   │   └── store.ts          # Client-side LocalStorage + Vector Similarity logic
├── docker-compose.yml        # App-only deployment
├── Dockerfile                
└── .env                      
```

## 核心设计思路 (MVP)

1.  **隐私保护**: 任务内容默认仅存储在用户浏览器 `LocalStorage` 中，未配置外部存储也可正常使用。
2.  **轻量后端**: 后端以 AI 处理为主，同时提供可选的 Redis 异步同步队列。
3.  **零成本部署**: 不配置数据库时，VPS 资源消耗极低，适合轻量部署。
4.  **向量检索**: 在前端使用 JavaScript 实时计算余弦相似度，实现“语义模糊记忆找回”。

## 同步与存储分工

- **Redis（异步同步）**
  - 用于同步队列与并发控制。
  - 同步改为“异步入队 + 轮询结果”，服务端串行合并，避免多端同时同步不一致。

- **PostgreSQL（业务数据存储）**
  - 用于存储任务/习惯/倒数日等结构化数据（可选）。
  - 未配置 PG 时，继续使用 LocalStorage，不影响使用。

- **WebDAV（附件存储）**
  - 仅用于待办附件文件存储（非数据同步）。
  - 附件单文件 ≤ 30MB，待办条目拥有附件属性（上传/下载关联）。
  - 未配置 WebDAV 时，不影响待办使用。

## 接口说明
- `POST /api/ai/process`: 
  - `mode: 'create'`: 输入自然语言，返回结构化 Task + Embedding。
  - `mode: 'search'`: 输入查询词，返回 Embedding。
