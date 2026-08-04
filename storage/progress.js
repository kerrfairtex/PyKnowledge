/**
 * Progress tracking and module unlocking logic.
 */

import { getProgress, saveProgress } from '../core/storage.js';

export function checkPrerequisite(moduleId, lessonsData) {
  const progress = getProgress();
  const module = lessonsData.modules.find((m) => m.id === moduleId);
  if (!module) return { allowed: false, reason: 'Module not found' };

  if (!module.prerequisite) {
    return { allowed: true };
  }

  const prereqModule = lessonsData.modules.find((m) => m.id === module.prerequisite);
  if (!prereqModule) {
    return { allowed: true };
  }

  const prereqLessonIds = prereqModule.lessons.map((l) => l.id);
  const completed = progress.completedLessons;
  const allComplete = prereqLessonIds.every((id) => completed.includes(id));

  if (allComplete) {
    return { allowed: true };
  }

  const remaining = prereqLessonIds.filter((id) => !completed.includes(id));
  return {
    allowed: false,
    reason: `Complete all lessons in "${prereqModule.title}" first`,
    remainingLessons: remaining
  };
}

export function unlockNextModule(completedLessonId, lessonsData) {
  const progress = getProgress();
  let changed = false;

  for (const mod of lessonsData.modules) {
    if (progress.unlockedModules.includes(mod.id)) continue;

    const check = checkPrerequisite(mod.id, lessonsData);
    if (check.allowed) {
      progress.unlockedModules.push(mod.id);
      changed = true;
    }
  }

  if (changed) {
    saveProgress(progress);
  }
  return progress;
}

export function getModuleProgress(moduleId, lessonsData) {
  const progress = getProgress();
  const module = lessonsData.modules.find((m) => m.id === moduleId);
  if (!module) return { total: 0, completed: 0, percent: 0 };

  const total = module.lessons.length;
  const completed = module.lessons.filter((l) =>
    progress.completedLessons.includes(l.id)
  ).length;

  return {
    total,
    completed,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0
  };
}

export function getOverallProgress(lessonsData) {
  let totalLessons = 0;
  let completedLessons = 0;
  const progress = getProgress();

  for (const mod of lessonsData.modules) {
    totalLessons += mod.lessons.length;
    completedLessons += mod.lessons.filter((l) =>
      progress.completedLessons.includes(l.id)
    ).length;
  }

  return {
    totalLessons,
    completedLessons,
    percent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  };
}
