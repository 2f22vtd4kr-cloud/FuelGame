import type { TaskDef, TaskDefKey } from '../game/types';

export const TASK_DEFS: Record<TaskDefKey, TaskDef> = {
  shawarma: {
    key: 'shawarma',
    label: 'Купи шаурму',
    emoji: '🌯',
    duration: 5,
    unityReward: 8,
    color: '#FF8C00',
  },
  intercom: {
    key: 'intercom',
    label: 'Почини домофон',
    emoji: '📟',
    duration: 6,
    unityReward: 8,
    color: '#2196F3',
  },
  trash: {
    key: 'trash',
    label: 'Вынеси мусор',
    emoji: '🗑️',
    duration: 5,
    unityReward: 8,
    color: '#795548',
  },
  window: {
    key: 'window',
    label: 'Помой окно',
    emoji: '🪟',
    duration: 7,
    unityReward: 8,
    color: '#00BCD4',
  },
  grandma: {
    key: 'grandma',
    label: 'Проводи бабушку',
    emoji: '👵',
    duration: 9,
    unityReward: 10,
    color: '#9C27B0',
  },
  mailbox: {
    key: 'mailbox',
    label: 'Проверь почту',
    emoji: '📬',
    duration: 4,
    unityReward: 7,
    color: '#F44336',
  },
  pigeons: {
    key: 'pigeons',
    label: 'Покорми голубей',
    emoji: '🕊️',
    duration: 5,
    unityReward: 7,
    color: '#78909C',
  },
  flowers: {
    key: 'flowers',
    label: 'Полей цветы',
    emoji: '🌸',
    duration: 4,
    unityReward: 7,
    color: '#EC407A',
  },
  kvass: {
    key: 'kvass',
    label: 'Купи квас',
    emoji: '🍺',
    duration: 4,
    unityReward: 7,
    color: '#FFA726',
  },
  sweep: {
    key: 'sweep',
    label: 'Подмети крыльцо',
    emoji: '🧹',
    duration: 6,
    unityReward: 8,
    color: '#8BC34A',
  },
};

export function getTaskDef(key: TaskDefKey): TaskDef {
  return TASK_DEFS[key];
}
