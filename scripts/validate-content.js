import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  validateLessonsSchema,
  validateQuizzesSchema,
  validateContentIntegrity
} from '../utils/schema.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

try {
  const lessons = JSON.parse(readFileSync(join(root, 'content/lessons.json'), 'utf8'));
  const quizzes = JSON.parse(readFileSync(join(root, 'content/quizzes.json'), 'utf8'));

  validateLessonsSchema(lessons);
  validateQuizzesSchema(quizzes);
  validateContentIntegrity(lessons, quizzes);

  console.log('Content validation passed');
  console.log(`  Modules: ${lessons.modules.length}`);
  console.log(`  Lessons: ${lessons.modules.reduce((n, m) => n + m.lessons.length, 0)}`);
  console.log(`  Quizzes: ${quizzes.quizzes.length}`);
} catch (err) {
  console.error('Content validation failed:', err.message);
  if (err.details) err.details.forEach((d) => console.error(`  - ${d}`));
  process.exit(1);
}
