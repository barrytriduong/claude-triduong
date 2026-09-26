import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

import { LEVELS } from './lib/levels';
const level = z.enum(LEVELS);

// A line of the video transcript. `t` is the start time in seconds.
const line = z.object({ t: z.number(), text: z.string() });

const word = z.object({
  word: z.string(),
  pos: z.string(), // part of speech, e.g. "noun"
  meaning: z.string(),
  example: z.string(), // ideally the sentence from the video
  t: z.number().optional(), // where the word is said in the video
  forms: z.array(z.string()).default([]), // other forms to highlight in the transcript, e.g. "gave up"
});

const question = z.discriminatedUnion('type', [
  // Classic multiple choice. `answer` is the index of the correct option.
  z.object({
    type: z.literal('choice'),
    prompt: z.string(),
    options: z.array(z.string()).min(2),
    answer: z.number(),
    explain: z.string().optional(),
    t: z.number().optional(), // "watch that part again" link
  }),
  z.object({
    type: z.literal('truefalse'),
    prompt: z.string(),
    answer: z.boolean(),
    explain: z.string().optional(),
    t: z.number().optional(),
  }),
  // Fill the gap. Write the gap as ___ in `sentence`.
  z.object({
    type: z.literal('gap'),
    sentence: z.string(),
    options: z.array(z.string()).min(2),
    answer: z.string(),
    explain: z.string().optional(),
  }),
  // Put the words in order. `sentence` is the correct sentence.
  z.object({
    type: z.literal('order'),
    prompt: z.string().default('Put the words in the right order.'),
    sentence: z.string(),
    explain: z.string().optional(),
  }),
  // Match each word to its meaning.
  z.object({
    type: z.literal('match'),
    prompt: z.string().default('Match each word to its meaning.'),
    pairs: z.array(z.object({ left: z.string(), right: z.string() })).min(2),
  }),
]);

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lessons' }),
  schema: z.object({
    title: z.string(),
    person: z.string(),
    summary: z.string(),
    level,
    topics: z.array(z.string()).default([]),
    publishDate: z.coerce.date(),
    // The part after "watch?v=" in the YouTube link. Leave empty until the video is live.
    youtubeId: z.string().default(''),
    duration: z.string().optional(), // e.g. "6:40"
    cover: z.string().optional(), // path under /public, used when there is no video yet
    draft: z.boolean().default(false),
    transcript: z.array(line),
    vocabulary: z.array(word),
    quiz: z.array(question),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    levels: z.array(level).min(1),
    tags: z.array(z.string()).default([]),
    cover: z.string(),
    coverAlt: z.string(),
    readingTime: z.string().optional(),
    // true = the post contains affiliate links; shows a short disclosure at the top
    affiliate: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { lessons, blog };
