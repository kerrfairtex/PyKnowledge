import { Router } from 'express';
import { asyncHandler } from '../middleware/error.js';
import { getLessonsPayload, getQuizzesPayload, getManifestMeta } from '../services/content.js';

const router = Router();

router.get('/manifest', asyncHandler(async (_req, res) => {
  const meta = await getManifestMeta();
  res.json(meta);
}));

router.get('/lessons', asyncHandler(async (_req, res) => {
  const lessons = await getLessonsPayload();
  res.json(lessons);
}));

router.get('/quizzes', asyncHandler(async (_req, res) => {
  const quizzes = await getQuizzesPayload();
  res.json(quizzes);
}));

export default router;
