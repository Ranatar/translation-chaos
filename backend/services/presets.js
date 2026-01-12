const presets = {
  'babel-tower': {
    name: 'Вавилонская башня',
    languages: ['ru', 'ar', 'he', 'fa', 'tr', 'ru'],
    difficulty: 3,
    description: 'Религиозно-культурный контекст'
  },
  
  'silk-road': {
    name: 'Шёлковый путь',
    languages: ['ru', 'zh', 'vi', 'th', 'hi', 'ru'],
    difficulty: 2,
    description: 'Азиатская одиссея'
  },
  
  'viking-lost': {
    name: 'Викинги заблудились',
    languages: ['ru', 'is', 'no', 'sv', 'fi', 'ru'],
    difficulty: 4,
    description: 'Скандинавский лабиринт'
  },
  
  'isolate-extreme': {
    name: 'Языковой изолят',
    languages: ['ru', 'eu', 'ko', 'ka', 'mt', 'hu', 'ru'],
    difficulty: 5,
    description: 'Только изоляты и редкие семьи'
  },
  
  'metaphor-killer': {
    name: 'Убийца метафор',
    languages: ['ru', 'ja', 'ar', 'fi', 'is', 'ru'],
    difficulty: 4,
    description: 'Для поэзии и идиом'
  }
};

export default {
  getAll() {
    return Object.entries(presets).map(([key, value]) => ({
      id: key,
      ...value
    }));
  },
  
  get(id) {
    return presets[id];
  }
};