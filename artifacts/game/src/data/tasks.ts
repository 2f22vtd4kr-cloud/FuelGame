import type { TaskDef, TaskDefKey } from '../game/types';

export const TASK_DEFS: Record<TaskDefKey, TaskDef> = {
  shawarma: {
    key: 'shawarma',
    label: 'Купи шаурму',
    emoji: '🌯',
    duration: 5,
    unityReward: 12,
    color: '#FF8C00',
  },
  intercom: {
    key: 'intercom',
    label: 'Почини домофон',
    emoji: '📟',
    duration: 6,
    unityReward: 12,
    color: '#2196F3',
  },
  trash: {
    key: 'trash',
    label: 'Вынеси мусор',
    emoji: '🗑️',
    duration: 5,
    unityReward: 12,
    color: '#795548',
  },
  window: {
    key: 'window',
    label: 'Помой окно',
    emoji: '🪟',
    duration: 7,
    unityReward: 12,
    color: '#00BCD4',
  },
  grandma: {
    key: 'grandma',
    label: 'Проводи бабушку',
    emoji: '👵',
    duration: 8,
    unityReward: 16,
    color: '#9C27B0',
  },
};

export function getTaskDef(key: TaskDefKey): TaskDef {
  return TASK_DEFS[key];
}
