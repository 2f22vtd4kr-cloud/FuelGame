import type { CharacterDef, CharacterKey } from '../game/types';

export const CHARACTERS: Record<CharacterKey, CharacterDef> = {
  denis: {
    key: 'denis',
    name: 'Денис',
    emoji: '🧑',
    color: '#E53935',
    description: 'Курьер Яндекс Доставки. Смена горит.',
    voiceLines: [
      'Смена горит, братан.',
      'Я вообще тут мимо проходил.',
      'У меня доставка через 3 минуты.',
      'Не мой район.',
      'Всё, удаляюсь.',
    ],
  },
  anya: {
    key: 'anya',
    name: 'Аня',
    emoji: '👩',
    color: '#8E24AA',
    description: 'Каршерингист. «Это не моя тачка».',
    voiceLines: [
      'Это не моя тачка.',
      'Я просто брала каршеринг.',
      'Документов нет, но я объясню.',
      'Счёт покроет каршеринг.',
    ],
  },
  vova: {
    key: 'vova',
    name: 'Вова Крипто',
    emoji: '🤑',
    color: '#F4511E',
    description: 'Трейдер USDT. Всё переводит в крипту.',
    voiceLines: [
      'Это инвестиция, бро.',
      'USDT не обманет.',
      'Я в плюсе, можете проверить.',
      'Бензин — это убыток.',
      'Мой кошелёк чист.',
    ],
  },
  uncle_seryozha: {
    key: 'uncle_seryozha',
    name: 'Дядя Серёжа',
    emoji: '👴',
    color: '#7B1FA2',
    description: 'Пенсионер с балкона. Знает всё обо всех.',
    voiceLines: [
      'А я всё видел с балкона!',
      'Талоны у меня есть.',
      'Я в 90-е и не такое видел.',
      'Вот в мои годы...',
      'Участковый — мой племянник.',
    ],
  },
  petrovich: {
    key: 'petrovich',
    name: 'Петрович',
    emoji: '🔧',
    color: '#1565C0',
    description: 'Механик. Чинит всем машины. Бесплатно. Подозрительно.',
    voiceLines: [
      'Я просто смотрел двигатель.',
      'Карбюратор барахлит.',
      'Ключ на 17 — дай.',
      'Я тут по делу.',
      'Масло менял, не сливал.',
    ],
  },
  marina: {
    key: 'marina',
    name: 'Марина Блогерша',
    emoji: '📱',
    color: '#E91E63',
    description: '240k подписчиков в TikTok. Снимает всё.',
    voiceLines: [
      'Это для контента!',
      'Подпишись, кстати.',
      'Я снимала себя, не вас.',
      'Это станет вирусным.',
      'Стрик лопнул из-за вас.',
    ],
  },
  akhmet: {
    key: 'akhmet',
    name: 'Ахмет Дворник',
    emoji: '🧹',
    color: '#FF8F00',
    description: 'Дворник. Видит всё. Говорит мало.',
    voiceLines: [
      '...',
      'Видел. Не скажу.',
      'Метлу дай.',
      'Холодно сегодня.',
      'Не моё дело.',
    ],
  },
  oleg: {
    key: 'oleg',
    name: 'Олег Силовик',
    emoji: '🕵️',
    color: '#212121',
    description: 'Охранник. Подозревает всех профессионально.',
    voiceLines: [
      'Гражданин, представьтесь.',
      'Я фиксирую.',
      'У меня травматик.',
      'Фиксирую на камеру.',
      'Пройдемте.',
    ],
  },
  lena: {
    key: 'lena',
    name: 'Лена Эко',
    emoji: '🚲',
    color: '#33691E',
    description: 'Эко-активистка на велосипеде. Такси берёт на дачу.',
    voiceLines: [
      'Я на велосипеде.',
      'Углеродный след, ребята.',
      'Это перераспределение ресурсов.',
      'Планета плачет.',
      'У меня многоразовая бутылка.',
    ],
  },
  barsik: {
    key: 'barsik',
    name: 'Барсик',
    emoji: '🐱',
    color: '#FF7043',
    description: 'Рыжий кот. Живёт во дворе. Видит всё.',
    voiceLines: [
      'Мяу.',
      'Мяу.',
      'Мяу.',
      'Мяу.',
      'Мяу.',
    ],
  },
};

export const CHARACTER_KEYS = Object.keys(CHARACTERS) as CharacterKey[];

export function getCharacter(key: CharacterKey): CharacterDef {
  return CHARACTERS[key];
}
