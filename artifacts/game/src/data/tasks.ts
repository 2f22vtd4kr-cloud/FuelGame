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
  // §2.5 Task 06 — Walk the dog
  dog_walk: {
    key: 'dog_walk',
    label: 'Выгулять Бакса',
    emoji: '🐕',
    duration: 15,
    unityReward: 10,
    color: '#8D6E63',
  },
  // §2.5 Task 07 — Buy flowers (match correct bouquet)
  flower_match: {
    key: 'flower_match',
    label: 'Купить цветы',
    emoji: '💐',
    duration: 5,
    unityReward: 8,
    color: '#E91E63',
  },
  // §2.5 Task 08 — Calm the drunk (dialogue tree)
  drunk_calm: {
    key: 'drunk_calm',
    label: 'Успокоить Васю',
    emoji: '🍻',
    duration: 10,
    unityReward: 9,
    color: '#F57C00',
  },
  // §2.5 Task 10 — Order a taxi (phone UI)
  taxi_order: {
    key: 'taxi_order',
    label: 'Заказать такси',
    emoji: '📱',
    duration: 5,
    unityReward: 7,
    color: '#FFD600',
  },
  // §2.5 Task 12 — Help carry bags (walk NPC to entrance)
  help_bags: {
    key: 'help_bags',
    label: 'Помочь с сумками',
    emoji: '🛍️',
    duration: 12,
    unityReward: 10,
    color: '#AB47BC',
  },
  // §2.5 Task 14 — Find the cat (walk to hiding spots)
  find_cat: {
    key: 'find_cat',
    label: 'Найти Барсика',
    emoji: '🐱',
    duration: 10,
    unityReward: 9,
    color: '#FF7043',
  },
  // §2.5 Task 15 — Fix the swing (rhythm tap 4 beats)
  fix_swing: {
    key: 'fix_swing',
    label: 'Починить качели',
    emoji: '🛺',
    duration: 6,
    unityReward: 8,
    color: '#26C6DA',
  },
  // §2.5 Task 17 — Water the lawn (rapid taps = circular motion)
  water_lawn: {
    key: 'water_lawn',
    label: 'Полить газон',
    emoji: '💧',
    duration: 6,
    unityReward: 8,
    color: '#29B6F6',
  },
  // §2.5 Task 18 — Check the meter (tap 4 digits ascending)
  check_meter: {
    key: 'check_meter',
    label: 'Проверить счётчик',
    emoji: '📊',
    duration: 5,
    unityReward: 7,
    color: '#9CCC65',
  },
  // §2.5 Task 20 — Close the tap (rotate dial 720° = 2 full stops)
  close_tap: {
    key: 'close_tap',
    label: 'Закрыть кран',
    emoji: '🔧',
    duration: 4,
    unityReward: 7,
    color: '#5C6BC0',
  },
};

export function getTaskDef(key: TaskDefKey): TaskDef {
  return TASK_DEFS[key];
}
