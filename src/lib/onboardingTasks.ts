export const DEFAULT_ONBOARDING_TASK_TITLES = [
  '欢迎使用 Recall：先点左侧切换到「今日」看看',
  '试试输入：明天下午 3 点提醒我开会',
  '给任务加上 #标签 或 @列表，快速分类',
  '完成后点小圆圈 ✅，感受一下流程',
] as const;

const ONBOARDING_TASK_TITLE_SET = new Set(
  DEFAULT_ONBOARDING_TASK_TITLES.map((title) => title.trim()),
);

export const isOnboardingTaskTitle = (title: string | null | undefined) => (
  typeof title === 'string' && ONBOARDING_TASK_TITLE_SET.has(title.trim())
);

export const isOnboardingTask = <T extends object>(task: T | null | undefined) => {
  if (!task || typeof task !== 'object') return false;
  const title = (task as { title?: string | null }).title;
  return isOnboardingTaskTitle(title);
};

export const filterOutOnboardingTasks = <T extends object>(tasks: T[]) => (
  tasks.filter((task) => !isOnboardingTask(task))
);
