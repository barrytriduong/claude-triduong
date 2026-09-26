export const SITE = {
  name: 'Bright Lives English',
  tagline: 'Real stories. Real English.',
  description:
    'Learn English with short, inspiring videos about real people. Every lesson has a follow-along transcript, interactive vocabulary and a fun quiz, from A1 to C2.',
  youtube: 'https://www.youtube.com/@brightlivesenglish',
  youtubeSubscribe: 'https://www.youtube.com/@brightlivesenglish?sub_confirmation=1',
  // TODO before launch: your contact email and your name (or business name)
  email: '[YOUR EMAIL]',
  owner: '[YOUR NAME]',
};

export function formatDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
