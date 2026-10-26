// Challenges. Level challenges are earned from all your reading; group challenges have
// their own reading track and are stored on the server (seeded in seed_iman.sql, same ids).
export type LevelChallenge = { id: string; level: number; levelName: string; title: string; unit: 'verses' | 'minutes'; target: number };
export type GroupChallenge = { id: string; title: string; description: string; target: number; days: number; translationOnly: boolean };

export const LEVELS = [
  { level: 1, name: 'Agimi', subtitle: 'Hapat e parë' },
  { level: 2, name: 'Mëngjesi', subtitle: 'Shprehia merr formë' },
  { level: 3, name: 'Dita', subtitle: 'Leximi bëhet pjesë e jetës' },
  { level: 4, name: 'Yjet', subtitle: 'Hatmja e Kur\'anit' },
] as const;

export const LEVEL_CHALLENGES: LevelChallenge[] = [
  { id: 'agimi-ajete', level: 1, levelName: 'Agimi', title: 'Lexo 50 ajete', unit: 'verses', target: 50 },
  { id: 'agimi-minuta', level: 1, levelName: 'Agimi', title: '30 minuta me Kur\'anin', unit: 'minutes', target: 30 },
  { id: 'mengjesi-ajete', level: 2, levelName: 'Mëngjesi', title: 'Lexo 300 ajete', unit: 'verses', target: 300 },
  { id: 'mengjesi-minuta', level: 2, levelName: 'Mëngjesi', title: '2 orë me Kur\'anin', unit: 'minutes', target: 120 },
  { id: 'dita-ajete', level: 3, levelName: 'Dita', title: 'Lexo 1 000 ajete', unit: 'verses', target: 1000 },
  { id: 'dita-minuta', level: 3, levelName: 'Dita', title: '10 orë me Kur\'anin', unit: 'minutes', target: 600 },
  { id: 'yjet-hatme', level: 4, levelName: 'Yjet', title: 'Lexo të gjithë Kur\'anin', unit: 'verses', target: 6236 },
];

export const GROUP_CHALLENGES: GroupChallenge[] = [
  {
    id: '6f1d2c3a-0b1e-4c5d-9a8b-1c2d3e4f5a60',
    title: 'Kur\'ani në 30 ditë',
    description: 'Lexo të gjithë Kur\'anin në shqip, me kuptim, brenda 30 ditëve. Ka gjurmën e vet, pa prekur leximin ditor.',
    target: 6236,
    days: 30,
    translationOnly: true,
  },
];
