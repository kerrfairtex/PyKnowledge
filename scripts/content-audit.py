#!/usr/bin/env python3
"""
PyKnowledge — content audit
Counts modules, lessons, exercises (by type), and quiz questions (by type)
across content/lessons.json and content/quizzes.json.
"""
import json
from collections import Counter

def load(path):
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"  (not found: {path})")
        return None

print("=" * 60)
print("LESSONS")
print("=" * 60)

lessons_data = load('content/lessons.json')
if lessons_data:
    modules = lessons_data.get('modules', [])
    total_lessons = 0
    total_exercises = 0
    ex_type_counts = Counter()
    difficulty_counts = Counter()

    for m in modules:
        m_lessons = m.get('lessons', [])
        total_lessons += len(m_lessons)
        m_exercises = 0
        for l in m_lessons:
            exs = l.get('exercises', [])
            m_exercises += len(exs)
            for ex in exs:
                ex_type_counts[ex.get('type', 'unknown')] += 1
                difficulty_counts[ex.get('difficulty', 'unspecified')] += 1
        total_exercises += m_exercises
        prereq = m.get('prerequisite') or 'none'
        print(f"  {m['id']:<10} {m['title']:<35} {len(m_lessons)} lessons, {m_exercises} exercises  (prereq: {prereq})")

    print()
    print(f"Modules: {len(modules)}")
    print(f"Lessons: {total_lessons}")
    print(f"Exercises: {total_exercises}")
    print()
    print("Exercises by type:")
    for t, c in ex_type_counts.most_common():
        print(f"  {t:<18} {c}")
    print()
    print("Exercises by difficulty:")
    for d, c in difficulty_counts.most_common():
        print(f"  {d:<18} {c}")

print()
print("=" * 60)
print("QUIZZES")
print("=" * 60)

quizzes_data = load('content/quizzes.json')
if quizzes_data:
    quizzes = quizzes_data.get('quizzes', [])
    total_questions = 0
    q_type_counts = Counter()

    for q in quizzes:
        questions = q.get('questions', [])
        total_questions += len(questions)
        for question in questions:
            q_type_counts[question.get('type', 'unknown')] += 1
        print(f"  {q.get('id', '?'):<15} {len(questions)} questions")

    print()
    print(f"Quizzes: {len(quizzes)}")
    print(f"Total questions: {total_questions}")
    print()
    print("Questions by type:")
    for t, c in q_type_counts.most_common():
        print(f"  {t:<18} {c}")

print()
print("=" * 60)
print("GRAND TOTAL (exercises + quiz questions)")
print("=" * 60)
grand_total = 0
if lessons_data:
    grand_total += total_exercises
if quizzes_data:
    grand_total += total_questions
print(f"  {grand_total} scoreable items across the whole project")
