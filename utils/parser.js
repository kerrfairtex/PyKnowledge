/**
 * Lesson content parsing utilities.
 */

export function parseLessonContent(lesson) {
  if (!lesson || !lesson.content) {
    return { sections: [], hasVideo: false };
  }

  const sections = lesson.content.sections || [];
  const hasVideo = Boolean(lesson.video);

  return {
    id: lesson.id,
    title: lesson.title,
    sections,
    hasVideo,
    videoSrc: lesson.video || null,
    duration: lesson.duration || null
  };
}

export function parseModuleList(lessonsData) {
  if (!lessonsData || !lessonsData.modules) return [];
  return lessonsData.modules.map((mod) => ({
    id: mod.id,
    title: mod.title,
    description: mod.description,
    prerequisite: mod.prerequisite || null,
    lessons: mod.lessons || []
  }));
}
