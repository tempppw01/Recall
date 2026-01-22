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

1.  **隐私保护**: 任务内容仅存储在用户的浏览器 `LocalStorage` 中，不上传到任何后端数据库。
2.  **轻量后端**: 后端仅作为 AI 处理的代理（Stateless API），负责调用 LLM 进行意图识别和生成 Embedding。
3.  **零成本部署**: 由于不需要数据库，VPS 资源消耗极低，非常适合低配环境。
4.  **向量检索**: 在前端使用 JavaScript 实时计算余弦相似度，实现“语义模糊记忆找回”。

## 接口说明
- `POST /api/ai/process`: 
  - `mode: 'create'`: 输入自然语言，返回结构化 Task + Embedding。
  - `mode: 'search'`: 输入查询词，返回 Embedding。
