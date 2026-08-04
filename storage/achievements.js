/**
 * Achievement system for PyKnowledge.
 */

import { getProgress, saveProgress } from '../core/storage.js';

const ACHIEVEMENTS = [
  {
    id: 'first-lesson',
    title: 'First Steps',
    description: 'Complete your first lesson',
    check: (progress) => progress.completedLessons.length >= 1
  },
  {
    id: 'first-quiz',
    title: 'Quiz Taker',
    description: 'Pass your first quiz with 70% or higher',
    check: (progress) =>
      Object.values(progress.quizScores).some((s) => s >= 70)
  },
  {
    id: 'module-complete',
    title: 'Module Master',
    description: 'Complete all lessons in a module',
    check: (progress, lessonsData) => {
      if (!lessonsData) return false;
      return lessonsData.modules.some((mod) => {
        const ids = mod.lessons.map((l) => l.id);
        return ids.length > 0 && ids.every((id) => progress.completedLessons.includes(id));
      });
    }
  },
  {
    id: 'perfect-score',
    title: 'Perfect Score',
    description: 'Score 100% on any quiz',
    check: (progress) =>
      Object.values(progress.quizScores).some((s) => s === 100)
  }
];

export function checkAchievements(lessonsData) {
  const progress = getProgress();
  const newlyUnlocked = [];

  for (const achievement of ACHIEVEMENTS) {
    if (progress.achievements.includes(achievement.id)) continue;
    if (achievement.check(progress, lessonsData)) {
      progress.achievements.push(achievement.id);
      newlyUnlocked.push(achievement);
    }
  }

  if (newlyUnlocked.length > 0) {
    saveProgress(progress);
  }

  return newlyUnlocked;
}

export function getAchievements(_lessonsData) {
  const progress = getProgress();
  return ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: progress.achievements.includes(a.id)
  }));
}
