import type { Task } from '@/lib/store';

export type CalendarTaskTone = {
  background: string;
  border: string;
  text: string;
  dot: string;
  shadow: string;
};

const CALENDAR_EVENT_TONES: CalendarTaskTone[] = [
  {
    background: 'rgba(83, 103, 202, 0.72)',
    border: 'rgba(114, 132, 255, 0.82)',
    text: '#F4F7FF',
    dot: '#D9E3FF',
    shadow: '0 18px 32px rgba(65, 84, 176, 0.22)',
  },
  {
    background: 'rgba(138, 95, 117, 0.72)',
    border: 'rgba(214, 139, 176, 0.84)',
    text: '#FFF4FA',
    dot: '#FFD9EA',
    shadow: '0 18px 32px rgba(138, 95, 117, 0.2)',
  },
  {
    background: 'rgba(99, 140, 161, 0.72)',
    border: 'rgba(123, 194, 224, 0.82)',
    text: '#F1FBFF',
    dot: '#D7F6FF',
    shadow: '0 18px 32px rgba(69, 126, 153, 0.22)',
  },
  {
    background: 'rgba(95, 107, 84, 0.72)',
    border: 'rgba(184, 201, 92, 0.78)',
    text: '#FAFFE8',
    dot: '#ECF7B4',
    shadow: '0 18px 32px rgba(95, 107, 84, 0.2)',
  },
  {
    background: 'rgba(145, 123, 113, 0.74)',
    border: 'rgba(234, 190, 174, 0.84)',
    text: '#FFF6F2',
    dot: '#FFE4D8',
    shadow: '0 18px 32px rgba(145, 123, 113, 0.22)',
  },
  {
    background: 'rgba(105, 128, 120, 0.72)',
    border: 'rgba(180, 225, 214, 0.78)',
    text: '#F5FFFC',
    dot: '#DBFFF2',
    shadow: '0 18px 32px rgba(105, 128, 120, 0.18)',
  },
];

const hashText = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getCalendarTaskTone = (task: Pick<Task, 'id' | 'category' | 'priority'>) => {
  const seed = `${task.category || ''}:${task.id}:${task.priority}`;
  return CALENDAR_EVENT_TONES[hashText(seed) % CALENDAR_EVENT_TONES.length];
};
