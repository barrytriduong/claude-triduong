export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_INFO: Record<Level, { name: string; can: string }> = {
  A1: { name: 'Beginner', can: 'Understand and use everyday phrases and very simple sentences.' },
  A2: { name: 'Elementary', can: 'Talk about yourself, your family, shopping and your job in simple words.' },
  B1: { name: 'Intermediate', can: 'Follow the main points of clear speech about familiar topics and tell a story.' },
  B2: { name: 'Upper intermediate', can: 'Understand most TV and videos, and talk with native speakers without much effort.' },
  C1: { name: 'Advanced', can: 'Understand long, difficult texts and express ideas fluently and precisely.' },
  C2: { name: 'Proficient', can: 'Understand almost everything you hear or read, with fine shades of meaning.' },
};
