import { checkPrerequisite, unlockNextModule, getModuleProgress, getOverallProgress } from '../storage/progress.js';
import { getProgress, saveProgress, resetProgress } from '../core/storage.js';

const store = {};
global.localStorage = {
  getItem: (key) => store[key] ?? null,
  setItem: (key, val) => { store[key] = String(val); },
  removeItem: (key) => { delete store[key]; }
};

const mockLessonsData = {
  modules: [
    { id: 'module-1', title: 'Module 1', prerequisite: null, lessons: [{ id: 'l1' }, { id: 'l2' }] },
    { id: 'module-2', title: 'Module 2', prerequisite: 'module-1', lessons: [{ id: 'l3' }] },
    { id: 'module-3', title: 'Module 3', prerequisite: 'module-2', lessons: [{ id: 'l4' }] }
  ]
};

describe('prerequisites', () => {
  beforeEach(() => { resetProgress(); });

  test('allows module with no prerequisite', () => {
    expect(checkPrerequisite('module-1', mockLessonsData).allowed).toBe(true);
  });

  test('blocks module when prerequisite incomplete', () => {
    const result = checkPrerequisite('module-2', mockLessonsData);
    expect(result.allowed).toBe(false);
    expect(result.remainingLessons).toEqual(['l1', 'l2']);
  });

  test('allows module when prerequisite complete', () => {
    saveProgress({ ...getProgress(), completedLessons: ['l1', 'l2'] });
    expect(checkPrerequisite('module-2', mockLessonsData).allowed).toBe(true);
  });

  test('partial completion does not unlock', () => {
    saveProgress({ ...getProgress(), completedLessons: ['l1'] });
    expect(checkPrerequisite('module-2', mockLessonsData).allowed).toBe(false);
  });

  test('successful unlock after completing all prerequisites', () => {
    saveProgress({ ...getProgress(), completedLessons: ['l1', 'l2'] });
    const result = unlockNextModule('l2', mockLessonsData);
    expect(result.unlockedModules).toContain('module-2');
  });

  test('failed unlock when prerequisites incomplete', () => {
    saveProgress({ ...getProgress(), completedLessons: ['l1'] });
    const result = unlockNextModule('l1', mockLessonsData);
    expect(result.unlockedModules).not.toContain('module-2');
  });

  test('invalid prerequisite ID is graceful', () => {
    const data = { modules: [{ id: 'm1', prerequisite: 'nonexistent', lessons: [{ id: 'l1' }] }] };
    expect(checkPrerequisite('m1', data).allowed).toBe(true);
  });

  test('state manipulation via saveProgress affects checks', () => {
    saveProgress({ ...getProgress(), completedLessons: ['l1', 'l2'] });
    expect(checkPrerequisite('module-2', mockLessonsData).allowed).toBe(true);
    saveProgress({ ...getProgress(), completedLessons: ['l1'] });
    expect(checkPrerequisite('module-2', mockLessonsData).allowed).toBe(false);
  });

  test('invalid progress state falls back to defaults', () => {
    localStorage.setItem('pyknowledge_progress', '{bad json');
    expect(checkPrerequisite('module-2', mockLessonsData).allowed).toBe(false);
  });

  test('chained prerequisites work correctly', () => {
    saveProgress({ ...getProgress(), completedLessons: ['l1', 'l2'], unlockedModules: ['module-1', 'module-2'] });
    const result = checkPrerequisite('module-3', mockLessonsData);
    expect(result.allowed).toBe(false);
    expect(result.remainingLessons).toEqual(['l3']);
  });
});