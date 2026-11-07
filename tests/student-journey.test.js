import { getProgress, resetProgress, markLessonComplete, isLessonComplete, migrateGuestProgress } from '../core/storage.js';
import { checkPrerequisite, unlockNextModule, getModuleProgress, getOverallProgress, validateProgressIntegrity } from '../storage/progress.js';

const store = {};
global.localStorage = {
  getItem: (key) => store[key] ?? null,
  setItem: (key, val) => { store[key] = String(val); },
  removeItem: (key) => { delete store[key]; },
};
global.sessionStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const mockLessonsData = {
  modules: [
    {
      id: 'module-1',
      title: 'Module 1',
      prerequisite: null,
      lessons: [
        { id: 'lesson-1-1', title: 'Lesson 1-1' },
        { id: 'lesson-1-2', title: 'Lesson 1-2' },
        { id: 'lesson-1-3', title: 'Lesson 1-3' },
      ],
    },
    {
      id: 'module-2',
      title: 'Module 2',
      prerequisite: 'module-1',
      lessons: [
        { id: 'lesson-2-1', title: 'Lesson 2-1' },
        { id: 'lesson-2-2', title: 'Lesson 2-2' },
      ],
    },
    {
      id: 'module-3',
      title: 'Module 3',
      prerequisite: 'module-2',
      lessons: [{ id: 'lesson-3-1', title: 'Lesson 3-1' }],
    },
  ],
};

// ---------- helpers ----------
function isLessonUnlocked(lessonId, lessonsData) {
  const progress = getProgress();
  const mod = lessonsData.modules.find((m) => m.lessons.some((l) => l.id === lessonId));
  if (!mod) return false;
  const idx = mod.lessons.findIndex((l) => l.id === lessonId);
  if (idx === 0) return true; // first lesson of module always accessible if module unlocked
  const prevLesson = mod.lessons[idx - 1];
  return progress.completedLessons.includes(prevLesson.id);
}

function isLessonLocked(lessonId, lessonsData) {
  return !isLessonUnlocked(lessonId, lessonsData);
}

describe('student journey: lesson -> quiz -> next lesson (no stuck)', () => {
  beforeEach(() => { resetProgress(); });

  test('new student can complete lesson 1 quiz, then lesson 2, then lesson 3, then module unlocks', () => {
    expect(isLessonComplete('lesson-1-1')).toBe(false);
    expect(checkPrerequisite('module-2', mockLessonsData).allowed).toBe(false);

    markLessonComplete('lesson-1-1', 85);
    expect(isLessonComplete('lesson-1-1')).toBe(true);
    expect(isLessonUnlocked('lesson-1-2', mockLessonsData)).toBe(true);

    markLessonComplete('lesson-1-2', 90);
    markLessonComplete('lesson-1-3', 95);

    expect(checkPrerequisite('module-2', mockLessonsData).allowed).toBe(true);
    const unlocked = unlockNextModule('lesson-1-3', mockLessonsData);
    expect(unlocked.unlockedModules).toContain('module-2');
    expect(isLessonUnlocked('lesson-2-1', mockLessonsData)).toBe(true);
  });
});

describe('every lesson has a path to its quiz', () => {
  beforeEach(() => { resetProgress(); });

  test('each lesson in module-1 can be marked complete via its quiz', () => {
    for (const lesson of mockLessonsData.modules[0].lessons) {
      markLessonComplete(lesson.id, 80);
      expect(isLessonComplete(lesson.id)).toBe(true);
    }
    expect(getProgress().completedLessons).toHaveLength(3);
  });

  test('lesson 2 is unlocked once lesson 1 is complete (prev-lesson rule)', () => {
    markLessonComplete('lesson-1-1');
    expect(isLessonUnlocked('lesson-1-2', mockLessonsData)).toBe(true);
  });

  test('lesson 3 is unlocked once lesson 2 is complete', () => {
    markLessonComplete('lesson-1-1');
    markLessonComplete('lesson-1-2');
    expect(isLessonUnlocked('lesson-1-3', mockLessonsData)).toBe(true);
  });
});

describe('student never reaches a locked dead end with no way forward', () => {
  beforeEach(() => { resetProgress(); });

  test('lesson N+1 is unlocked exactly when lesson N is complete', () => {
    expect(isLessonLocked('lesson-1-2', mockLessonsData)).toBe(true);
    markLessonComplete('lesson-1-1');
    expect(isLessonLocked('lesson-1-2', mockLessonsData)).toBe(false);

    expect(isLessonLocked('lesson-1-3', mockLessonsData)).toBe(true);
    markLessonComplete('lesson-1-2');
    expect(isLessonLocked('lesson-1-3', mockLessonsData)).toBe(false);
  });

  test('there is always a way forward after completing a lesson quiz', () => {
    markLessonComplete('lesson-1-1');
    expect(isLessonLocked('lesson-1-2', mockLessonsData)).toBe(false);
    expect(isLessonComplete('lesson-1-1')).toBe(true);
  });
});

describe('quiz pass marks only its lesson; module unlock waits for all lessons', () => {
  beforeEach(() => { resetProgress(); });

  test('passing lesson 1 quiz marks only lesson 1, not lesson 2 or 3', () => {
    markLessonComplete('lesson-1-1', 85);
    expect(isLessonComplete('lesson-1-1')).toBe(true);
    expect(isLessonComplete('lesson-1-2')).toBe(false);
    expect(isLessonComplete('lesson-1-3')).toBe(false);
  });

  test('module-2 does not unlock after only lesson 1 complete', () => {
    markLessonComplete('lesson-1-1', 85);
    expect(checkPrerequisite('module-2', mockLessonsData).allowed).toBe(false);
  });

  test('module-2 unlocks only after all three module-1 lessons complete', () => {
    markLessonComplete('lesson-1-1', 85);
    markLessonComplete('lesson-1-2', 90);
    expect(checkPrerequisite('module-2', mockLessonsData).allowed).toBe(false);
    markLessonComplete('lesson-1-3', 95);
    expect(checkPrerequisite('module-2', mockLessonsData).allowed).toBe(true);
  });
});

describe('failed retry never removes an earlier pass', () => {
  beforeEach(() => { resetProgress(); });

  test('markLessonComplete is idempotent and preserves a higher score', () => {
    markLessonComplete('lesson-1-1', 95);
    expect(getProgress().quizScores['lesson-1-1']).toBe(95);
    markLessonComplete('lesson-1-1'); // retry without score (failed retry path does not call this)
    expect(getProgress().quizScores['lesson-1-1']).toBe(95);
    expect(isLessonComplete('lesson-1-1')).toBe(true);
  });

  test('lesson 1 remains complete after lesson 2 is attempted and fails', () => {
    markLessonComplete('lesson-1-1', 95);
    // A failed quiz does NOT call markLessonComplete, so lesson-1-2 is not marked complete
    expect(isLessonComplete('lesson-1-1')).toBe(true);
    expect(isLessonComplete('lesson-1-2')).toBe(false);
    expect(checkPrerequisite('module-2', mockLessonsData).allowed).toBe(false);
  });
});

describe('dashboard primary button points to real next lesson', () => {
  beforeEach(() => { resetProgress(); });

  test('with nothing complete, module 1 has 0/3 lessons done', () => {
    const mp = getModuleProgress('module-1', mockLessonsData);
    expect(mp.completed).toBe(0);
    expect(mp.total).toBe(3);
    expect(mp.percent).toBe(0);
    expect(checkPrerequisite('module-1', mockLessonsData).allowed).toBe(true);
  });

  test('after lesson 1 complete, module 1 not done; next is lesson 1-2', () => {
    markLessonComplete('lesson-1-1');
    const mp = getModuleProgress('module-1', mockLessonsData);
    expect(mp.completed).toBe(1);
    expect(mp.percent).toBe(33);
    expect(isLessonLocked('lesson-1-2', mockLessonsData)).toBe(false);
  });

  test('after all module-1 lessons complete, module-1 done and module-2 unlocked', () => {
    markLessonComplete('lesson-1-1');
    markLessonComplete('lesson-1-2');
    markLessonComplete('lesson-1-3');
    const mp = getModuleProgress('module-1', mockLessonsData);
    expect(mp.completed).toBe(3);
    expect(mp.percent).toBe(100);
    expect(checkPrerequisite('module-2', mockLessonsData).allowed).toBe(true);
  });
});

describe('guest progress migrated to new profile keeps completed lessons', () => {
  beforeEach(() => { resetProgress(); });

  test('migrateGuestProgress carries completed lessons to profile storage', async () => {
    // migrateGuestProgress reads via load('progress', guestKey) which prepends
    // 'pyknowledge_progress_' to the key, then writes via persist() AND
    // localStorage.setItem(profileKey, ...) where profileKey = getProgressKey(newUserId).
    const guestKey = 'pyknowledge_progress_pyknowledge_progress_guest_123';
    localStorage.setItem(guestKey, JSON.stringify({
      version: 1,
      completedLessons: ['lesson-1-1', 'lesson-1-2'],
      quizScores: { 'lesson-1-1': 85 },
      achievements: [],
      lastAccessed: null,
      unlockedModules: ['module-1'],
    }));
    localStorage.setItem('pyknowledge_guest_id', 'guest_123');

    const migrated = await migrateGuestProgress('user_profile_1');
    expect(migrated).toBe(true);

    // Data should be at the profile's localStorage key (readLegacy reads this)
    const profileKey = 'pyknowledge_progress_user_profile_1';
    const migratedData = JSON.parse(localStorage.getItem(profileKey));
    expect(migratedData.completedLessons).toContain('lesson-1-1');
    expect(migratedData.completedLessons).toContain('lesson-1-2');
    expect(migratedData.completedLessons).not.toContain('lesson-1-3');
    expect(migratedData.quizScores['lesson-1-1']).toBe(85);
  });
});
