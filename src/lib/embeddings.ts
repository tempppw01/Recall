import OpenAI from 'openai';

// 懒加载 transformers 以避免在不需要时占用资源
let pipeline: any = null;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy',
  baseURL: process.env.OPENAI_BASE_URL || 'https://ai.shuaihong.fun/v1',
});

const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

type EmbeddingOptions = {
  client?: OpenAI;
  provider?: 'openai' | 'local';
  model?: string;
};

export async function generateEmbedding(text: string, options: EmbeddingOptions = {}): Promise<number[]> {
  const provider = options.provider || process.env.EMBEDDING_PROVIDER || 'openai';

  if (provider === 'local') {
    return generateLocalEmbedding(text);
  }

  const client = options.client || openai;
  const model = options.model || DEFAULT_EMBEDDING_MODEL;
  return generateOpenAIEmbedding(text, client, model);
}

async function generateOpenAIEmbedding(text: string, client: OpenAI, model: string): Promise<number[]> {
  try {
    const response = await client.embeddings.create({
      model, // 或 text-embedding-ada-002
      input: text,
      encoding_format: 'float',
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI Embedding Error:', error);
    throw new Error('Failed to generate embedding via OpenAI');
  }
}

async function generateLocalEmbedding(text: string): Promise<number[]> {
  // 动态导入 transformers.js
  if (!pipeline) {
    const { pipeline: transformerPipeline } = await import('@xenova/transformers');
    // 使用轻量级模型，例如 all-MiniLM-L6-v2
    pipeline = await transformerPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  const output = await pipeline(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}
