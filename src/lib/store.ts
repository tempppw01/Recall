export interface Task {
  id: string;
  title: string;
  dueDate?: string;
  priority: number;
  status: 'todo' | 'in_progress' | 'completed';
  tags: string[];
  embedding?: number[]; // 存储向量
  createdAt: string;
}

const STORAGE_KEY = 'recall_tasks_v1';

// 计算余弦相似度
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (!denominator) return 0;
  return dotProduct / denominator;
}

export const taskStore = {
  getAll: (): Task[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  add: (task: Task) => {
    const tasks = taskStore.getAll();
    tasks.push(task);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  },

  search: (queryEmbedding: number[], threshold = 0.7): Task[] => {
    const tasks = taskStore.getAll();
    return tasks
      .map(task => ({
        ...task,
        similarity: task.embedding ? cosineSimilarity(task.embedding, queryEmbedding) : 0
      }))
      .filter(item => item.similarity > threshold)
      .sort((a, b) => b.similarity - a.similarity);
  }
};
