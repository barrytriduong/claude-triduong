// A ready-to-paste YouTube description for each lesson, at /youtube/<slug>.txt
// Linking every video to its lesson page turns YouTube viewers into site visitors.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../../lib/site';
import { LEVEL_INFO } from '../../lib/levels';

export const getStaticPaths: GetStaticPaths = async () => {
  const lessons = await getCollection('lessons', (l) => !l.data.draft);
  return lessons.map((lesson) => ({ params: { slug: lesson.id }, props: { lesson } }));
};

export const GET: APIRoute = ({ props, site }) => {
  const { lesson } = props as { lesson: Awaited<ReturnType<typeof getCollection<'lessons'>>>[number] };
  const d = lesson.data;
  const url = new URL(`/lessons/${lesson.id}/`, site).href;
  const text = [
    `${d.summary}`,
    '',
    `📖 Free lesson with transcript, flashcards and quiz: ${url}`,
    '',
    `Level: ${d.level} (${LEVEL_INFO[d.level].name})`,
    '',
    'Words from this story:',
    ...d.vocabulary.map((w) => `• ${w.word} (${w.pos}): ${w.meaning}`),
    '',
    `Test yourself with the Story Challenge: ${url}#quiz`,
    `Find your level: ${new URL('/levels/', site).href}`,
    `More stories: ${new URL('/lessons/', site).href}`,
    '',
    `Subscribe for a new inspiring story every week: ${SITE.youtubeSubscribe}`,
    '',
    `#LearnEnglish #EnglishListening #${d.level}English ${d.topics.map((t) => '#' + t.replace(/\s+/g, '')).join(' ')}`,
  ].join('\n');
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
