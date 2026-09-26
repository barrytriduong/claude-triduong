// Lesson → number of quiz questions. Read by the leaderboard function to check scores.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const lessons = await getCollection('lessons', (l) => !l.data.draft);
  return new Response(JSON.stringify(Object.fromEntries(lessons.map((l) => [l.id, l.data.quiz.length]))), {
    headers: { 'Content-Type': 'application/json' },
  });
};
