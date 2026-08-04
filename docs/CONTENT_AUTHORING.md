# Content Authoring Guide

This guide explains how to create and maintain learning content for PyKnowledge.

## Content Files

| File | Purpose |
|------|---------|
| `content/lessons.json` | Module and lesson definitions |
| `content/quizzes.json` | Quiz questions linked to lessons |
| `content/assets/videos/` | MP4 video files (H.264, 720p recommended) |

## Lessons Schema

```json
{
  "version": "1.0.0",
  "curriculum": "CHED Python Programming",
  "modules": [
    {
      "id": "module-1",
      "title": "Module Title",
      "description": "Module description",
      "prerequisite": null,
      "lessons": [
        {
          "id": "lesson-1-1",
          "title": "Lesson Title",
          "duration": "15 min",
          "video": "content/assets/videos/lesson-1-1.mp4",
          "content": {
            "sections": [
              {
                "heading": "Section Heading",
                "body": "Section text content",
                "code": "print('optional code example')"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

### Module Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier (e.g., `module-1`) |
| `title` | Yes | Display name |
| `description` | Yes | Brief module summary |
| `prerequisite` | No | ID of module that must be completed first, or `null` |
| `lessons` | Yes | Array of lesson objects |

### Lesson Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier, must match a quiz `id` |
| `title` | Yes | Display name |
| `duration` | No | Estimated time (e.g., `"15 min"`) |
| `video` | No | Path to MP4 file, or `null` |
| `content.sections` | Yes | Array of content sections |

## Quizzes Schema

```json
{
  "version": "1.0.0",
  "quizzes": [
    {
      "id": "lesson-1-1",
      "title": "Quiz: Lesson Title",
      "lessonId": "lesson-1-1",
      "questions": [
        {
          "id": "q1",
          "type": "multiple-choice",
          "question": "Question text?",
          "options": ["Option A", "Option B", "Option C"],
          "correctAnswer": 1
        },
        {
          "id": "q2",
          "type": "true-false",
          "question": "Statement to evaluate?",
          "correctAnswer": true
        },
        {
          "id": "q3",
          "type": "fill-blank",
          "question": "What function prints output?",
          "correctAnswer": ["print", "print()"]
        }
      ]
    }
  ]
}
```

### Question Types

| Type | `correctAnswer` format |
|------|----------------------|
| `multiple-choice` | Index number (0-based) of correct option |
| `true-false` | `true` or `false` |
| `fill-blank` | String or array of accepted answers (case-insensitive) |

### Rules

- Every quiz `id` must match a lesson `id`
- Passing threshold is 70%
- Lessons unlock sequentially within a module
- Modules unlock when all lessons in the prerequisite module are complete

## Validation

Run before committing content changes:

```bash
npm run validate:content
```

This checks schema compliance and cross-references between lessons and quizzes.

## Adding Videos

1. Encode as MP4 H.264, 720p resolution
2. Place in `content/assets/videos/`
3. Reference path in lesson `video` field
4. Add video path to `core/service-worker.js` STATIC_ASSETS array

## After Content Changes

1. Validate: `npm run validate:content`
2. Bump version if releasing: update `package.json`, `core/version.js`, and service worker
3. Test offline: load app, go offline in DevTools, verify content still accessible
