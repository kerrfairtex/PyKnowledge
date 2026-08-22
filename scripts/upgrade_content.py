#!/usr/bin/env python3
"""One-time content upgrade: deepen 10 thinnest lessons, grow quizzes to 5+,
add module-9 capstone quiz, add parsons exercises to modules 4-9."""
import json, collections

# ============ PART 1: Deepen the 10 thinnest lessons ============
NEW_SECTIONS = {
    "lesson-2-1": [
        {"heading": "Common Mistakes to Avoid",
         "body": "Two errors catch almost every beginner:\n\n1. Using = instead of ==. A single equals sign assigns a value; a double equals compares two values. Writing if x = 5: is a syntax error in Python.\n\n2. Forgetting the colon. The if line must end with : — if score >= 75:. Python will remind you with a SyntaxError, but it is faster to build the habit now.\n\nAlso remember that indentation is not decoration. Every line inside the if block must be indented by the same amount (4 spaces is standard)."}
    ],
    "lesson-1-3": [
        {"heading": "input() Always Gives You Text",
         "body": "This trips up every new programmer: input() always returns a string, even when the user types digits. If you type 16 at the prompt, Python hands your program the text \"16\", not the number 16.\n\nWhy does this matter? \"16\" + 1 causes a TypeError, because you cannot add text to a number. Convert first with int():\n\nage = int(input(\"Age: \"))\nnext_year = age + 1   # works now\n\nIf the user types something that is not a number, int() raises an error. You will learn how to handle that safely with try/except in Module 8."}
    ],
    "lesson-2-2": [
        {"heading": "Choosing Between while and for",
         "body": "Use a for loop when you know how many times to repeat, or when looping over a collection. Use a while loop when you are waiting for something to happen and cannot predict the count.\n\nClassic while uses:\n\n* Asking until the answer is valid (menus, password prompts)\n* Countdowns driven by a condition\n* Games and simulations that run until a win/lose state\n\nDanger to avoid: if nothing inside the loop changes the condition, the loop never ends — an infinite loop. If a loop hangs your program in the code editor, check whether your update line (like count -= 1) actually runs on every pass."}
    ],
    "lesson-1-1": [
        {"heading": "Where Python Is Used Around You",
         "body": "Python quietly powers much of the software you already use. Instagram and YouTube rely on it for their back-end systems. Scientists use it to study weather patterns and crop yields. Banks use it to detect fraud. Teachers use it to grade and analyse results automatically.\n\nFor students in the Philippines, Python is also one of the most in-demand skills in local tech hiring — from Manila start-ups to remote work for overseas companies.\n\nThe point: learning Python is not just a school subject. It is a tool you can use for real projects, freelance work, or a future career, and everything you learn here works the same way on a laptop in Tawi-Tawi as on a server in Singapore."}
    ],
    "lesson-1-2": [
        {"heading": "Naming Things Well",
         "body": "Python lets you name variables almost anything, but good names make code readable. Compare:\n\nx = 90            # what is x?\nmath_score = 90   # instantly clear\n\nRules to remember: names can contain letters, numbers and underscores but must not START with a number. Spaces are not allowed — use underscores instead (first_name). Names are case-sensitive: Score and score are two different variables.\n\nPython style guide (PEP 8) recommends snake_case for variables: total_price, student_count, is_enrolled. Following this convention makes your code look professional and helps others read it instantly."}
    ],
    "lesson-7-1": [
        {"heading": "Why Formatting Matters",
         "body": "Raw output is fine for quick tests, but real programs present information neatly. Think of a receipt: items aligned in columns, totals right-aligned, prices to exactly two decimal places. Sloppy formatting makes programs harder to read even when they calculate correctly.\n\nf-strings solve this without clutter. The pattern f\"{value:>10}\" reserves 10 characters and pushes the value to the right — perfect for aligning numbers. Combining width and precision like f\"{price:8.2f}\" gives you fixed-width money columns.\n\nTry formatting the same data three ways in the editor below and compare which one a classmate could read fastest."
        }
    ],
    "lesson-6-3": [
        {"heading": "How to Explore a New Module",
         "body": "The standard library is huge — over 200 modules — so the real skill is exploring it, not memorising it. Two tools help:\n\nhelp(module) prints documentation right in your program: try help(math) to see every function math offers.\n\ndir(module) lists the names available inside it: dir(math) shows sqrt, pi, floor, and more. Then call help(math.floor) for details on one item.\n\nWhen you need something specific — random passwords, dates, file paths — search \"python <thing> standard library\" first. Chances are a built-in module already does it, well-tested and documented. Reaching for the standard library before writing your own code is a mark of an experienced developer."}
    ],
    "lesson-5-2": [
        {"heading": "Reading Comprehensions Backwards",
         "body": "Comprehensions are compact, but they take practice to read. The trick: read them as plain English from the for keyword.\n\n[n**2 for n in range(5)]\nmeans: \"give me n squared, for each n in 0..4\".\n\nAdd a filter at the end:\n\n[n**2 for n in range(5) if n % 2 == 0]\nmeans: \"n squared, for each n in 0..4, keeping only even n\".\n\nA good learning exercise: write a comprehension, then rewrite it as a regular for loop with append(). Both produce identical results — comprehensions are just shorthand. If a comprehension needs more than one if or a nested loop, experienced developers usually switch back to a normal loop because it becomes easier to read."}
    ],
    "lesson-9-2": [
        {"heading": "When to Use Inheritance",
         "body": "Inheritance is powerful but easy to overuse. The test: is the child a true specialised version of the parent? Dog IS AN Animal, Circle IS A Shape — those work. But a Car HAS AN Engine: that is composition (the car stores an engine object), not inheritance. Confusing the two leads to tangled code.\n\nIn PyKnowledge-style apps, inheritance appears everywhere: a QuizQuestion parent with MultipleChoiceQuestion and FillBlank children; each child stores different data but shares the same checking logic.\n\nRule of thumb for beginners: inherit only when the child can stand in for the parent anywhere in your program. If you find yourself deleting or overriding most of the parent's behaviour, inheritance was probably the wrong choice."}
    ],
    "lesson-7-3": [
        {"heading": "Why JSON Won",
         "body": "JSON (JavaScript Object Notation) became the universal data format because it is short, readable, and maps cleanly onto Python dictionaries. Every major web service accepts it, and it is human-readable enough to debug in any text editor.\n\nThe mental model: json.dump() converts your dictionary into a string and writes it out; json.load() reads a file and converts the text back into a fresh dictionary. Changes made after saving are NOT stored — you must dump again to persist them.\n\nLimitations worth knowing: JSON keys are always strings, and it has no special type for dates (people store them as ISO text like \"2026-08-22\"). For this course, saving progress files and small records is exactly what JSON is made for."
        }
    ]
}

d = json.load(open('content/lessons.json'))
deepened = []
for m in d['modules']:
    for l in m['lessons']:
        extra = NEW_SECTIONS.get(l['id'])
        if extra:
            l['content']['sections'].extend(extra)
            deepened.append(l['id'])
print("Deepened:", len(deepened), deepened)

with open('content/lessons.json', 'w') as f:
    json.dump(d, f, indent=2, ensure_ascii=False)

# ============ PART 2: Grow quizzes to 5+ questions ============
q = json.load(open('content/quizzes.json'))

NEW_QUESTIONS = {
"lesson-1-1": [
    {"id":"lesson-1-1-q5","type":"multiple-choice","question":"Which of these is NOT a reason Python is popular for beginners?","options":["Its syntax reads close to plain English","It runs on many operating systems","It requires declaring variable types before use","It has a huge standard library"],"correctAnswer":2,"concept":"language-basics"},
    {"id":"lesson-1-1-q6","type":"true-false","question":"The print() function displays text on the screen.","correctAnswer":True,"concept":"output"},
],
"lesson-1-3": [
    {"id":"lesson-1-3-q4","type":"fill-blank","question":"Complete the code so it prints the value of the variable score:  ___(score)","concept":"output","correctAnswer":["print","print()"]},
    {"id":"lesson-1-3-q5","type":"multiple-choice","question":"What does input(\"Name: \") return when the user types Ana?","options":["Ana (a str)","Ana (an int)","An error, because no number was entered","None"],"correctAnswer":0,"concept":"input"},
],
"lesson-2-1": [
    {"id":"lesson-2-1-q4","type":"fill-blank","question":"Complete the condition so the message prints when points are 100 or more:  if points ___ 100:","concept":"conditionals","correctAnswer":[">="]},
    {"id":"lesson-2-1-q5","type":"true-false","question":"In Python, the lines inside an if block must be indented.","correctAnswer":True,"concept":"conditionals"},
],
"lesson-2-2": [
    {"id":"lesson-2-2-q4","type":"multiple-choice","question":"What happens when a while loop's condition never becomes False?","options":["The loop runs forever (infinite loop)","Python stops it after 100 iterations","The program exits immediately","The loop body runs once"],"correctAnswer":0,"concept":"while-loop"},
    {"id":"lesson-2-2-q5","type":"fill-blank","question":"Which loop type is best when you know the exact number of repetitions: a ___ loop?","concept":"for-loop","correctAnswer":["for"]},
],
"lesson-3-1": [
    {"id":"lesson-3-1-q4","type":"fill-blank","question":"range(1, 6) produces the numbers 1 up to but not including ___.","concept":"for-loop","correctAnswer":["6"]},
    {"id":"lesson-3-1-q5","type":"multiple-choice","question":"What does this loop print? for letter in \"hi\": print(letter)","options":["h then i","hi on one line","0 then 1","Nothing — strings cannot be looped"],"correctAnswer":0,"concept":"for-loop"},
],
"lesson-3-2": [
    {"id":"lesson-3-2-q4","type":"fill-blank","question":"A countdown loop needs its counter to get smaller each time: count ___ 1","concept":"while-loop","correctAnswer":["-=","-= "]},
    {"id":"lesson-3-2-q5","type":"true-false","question":"A while loop checks its condition before each iteration, including the very first one.","correctAnswer":True,"concept":"while-loop"},
],
"lesson-4-1": [
    {"id":"lesson-4-1-q4","type":"fill-blank","question":"Which keyword defines a new function:  ___ greet(): ","concept":"functions","correctAnswer":["def"]},
    {"id":"lesson-4-1-q5","type":"true-false","question":"A function's body runs when the function is defined, not when it is called.","correctAnswer":False,"concept":"functions"},
],
"lesson-4-2": [
    {"id":"lesson-4-2-q4","type":"fill-blank","question":"Values written in a function definition are ___, while the real values passed during a call are arguments.","concept":"functions","correctAnswer":["parameters","parameter","params"]},
    {"id":"lesson-4-2-q5","type":"multiple-choice","question":"def order(item, qty=1): — what does qty=1 do?","options":["Gives qty a default value of 1","Makes qty optional AND default to 1","Both answers are correct","Forces the caller to always pass 1"],"correctAnswer":2,"concept":"functions"},
],
"lesson-4-3": [
    {"id":"lesson-4-3-q4","type":"fill-blank","question":"What keyword sends a result back to the caller:  ___ total","concept":"functions","correctAnswer":["return"]},
    {"id":"lesson-4-3-q5","type":"true-false","question":"Code placed after a return statement inside the same function still runs.","correctAnswer":False,"concept":"functions"},
],
"lesson-5-1": [
    {"id":"lesson-5-1-q4","type":"fill-blank","question":"Which list method adds an item to the END of a list: fruits.___(\"mango\")","concept":"lists","correctAnswer":["append","append()"]},
    {"id":"lesson-5-1-q5","type":"multiple-choice","question":"nums = [4, 8, 15] — what is nums[1]?","options":["8","4","15","IndexError"],"correctAnswer":0,"concept":"lists"},
],
"lesson-5-2": [
    {"id":"lesson-5-2-q4","type":"fill-blank","question":"Comprehensions use the keywords for and ___ to filter items.","concept":"list-comprehension","correctAnswer":["if"]},
    {"id":"lesson-5-2-q5","type":"true-false","question":"[x * 2 for x in range(3)] produces [0, 2, 4].","correctAnswer":True,"concept":"list-comprehension"},
],
"lesson-5-4": [
    {"id":"lesson-5-4-q4","type":"fill-blank","question":"Loop over BOTH key and value in a dict using:  for k, v in d.___():","concept":"dictionaries","correctAnswer":["items","items()"]},
    {"id":"lesson-5-4-q5","type":"multiple-choice","question":"Which is the cleanest way to get both index and value in a for loop?","options":["for i, v in enumerate(items):","for i in range(len(items)): then items[i]","Manually track a counter variable","Lists cannot give indexes"],"correctAnswer":0,"concept":"looping-techniques"},
],
"lesson-6-2": [
    {"id":"lesson-6-2-q3","type":"fill-blank","question":"Any Python file can serve as a module and be brought in with the ___ statement.","concept":"modules","correctAnswer":["import"]},
    {"id":"lesson-6-2-q4","type":"true-false","question":"Code under if __name__ == \"__main__\": runs when the file is imported by another module.","correctAnswer":False,"concept":"modules"},
],
"lesson-6-3": [
    {"id":"lesson-6-3-q4","type":"multiple-choice","question":"Which function shows the list of names available inside a module?","options":["dir(module)","list(module)","module.show()","print(module)"],"correctAnswer":0,"concept":"stdlib"},
    {"id":"lesson-6-3-q5","type":"fill-blank","question":"Which standard library module would you use to roll a random dice: import ___","concept":"stdlib","correctAnswer":["random"]},
],
"lesson-7-1": [
    {"id":"lesson-7-1-q4","type":"fill-blank","question":"Prefix the string with this single letter to enable brace substitution:  ___f\"Total: {total}\"","concept":"formatting","correctAnswer":["f","F"]},
    {"id":"lesson-7-1-q5","type":"multiple-choice","question":"What does f\"{price:.2f}\" do to 3.14159?","options":["Prints 3.14","Prints 3.14159","Rounds the variable permanently","Raises ValueError"],"correctAnswer":0,"concept":"formatting"},
],
"lesson-7-2": [
    {"id":"lesson-7-2-q4","type":"fill-blank","question":"Open a file for writing with:  open(\"data.txt\", ___)","concept":"files","correctAnswer":["\"w\"","w","'w'"]},
    {"id":"lesson-7-2-q5","type":"true-false","question":"Opening an existing file in \"w\" mode erases its previous contents.","correctAnswer":True,"concept":"files"},
],
"lesson-7-3": [
    {"id":"lesson-7-3-q4","type":"fill-blank","question":"Which json function converts a JSON string back into a Python object: json.___(text)","concept":"json","correctAnswer":["loads"]},
    {"id":"lesson-7-3-q5","type":"multiple-choice","question":"After json.dump(data, f), you change the data variable again. What is in the file?","options":["The old data — you must dump again","The new data automatically","Nothing; dump clears the file","The file updates continuously"],"correctAnswer":0,"concept":"json"},
],
"lesson-8-1": [
    {"id":"lesson-8-1-q4","type":"fill-blank","question":"int(\"12x\") raises a ___Error.","concept":"exceptions","correctAnswer":["value","Value"]},
    {"id":"lesson-8-1-q5","type":"true-false","question":"Syntax errors are detected before the program starts running.","correctAnswer":True,"concept":"syntax-errors"},
],
"lesson-8-2": [
    {"id":"lesson-8-2-q4","type":"multiple-choice","question":"Why prefer except ValueError over a bare except:?","options":["Bare except catches ALL errors, hiding real bugs","except ValueError runs faster","Bare except only works in functions","There is no difference"],"correctAnswer":0,"concept":"exceptions"},
    {"id":"lesson-8-2-q5","type":"fill-blank","question":"Only run cleanup no-matter-what code in a ___ block.","concept":"exceptions","correctAnswer":["finally"]},
],
"lesson-8-3": [
    {"id":"lesson-8-3-q4","type":"fill-blank","question":"Create your own error deliberately with the ___ statement.","concept":"exceptions","correctAnswer":["raise"]},
    {"id":"lesson-8-3-q5","type":"true-false","question":"raise ValueError(\"bad input\") immediately stops normal flow of the function.","correctAnswer":True,"concept":"exceptions"},
],
"lesson-9-3": [
    {"id":"lesson-9-3-q4","type":"fill-blank","question":"A generator function produces values one at a time using the ___ keyword.","concept":"generators","correctAnswer":["yield"]},
    {"id":"lesson-9-3-q5","type":"multiple-choice","question":"Why are generators memory-friendly?","options":["They yield one value at a time instead of building the whole list","They compress data automatically","They store values on disk","Python deletes them after use"],"correctAnswer":0,"concept":"generators"},
],
}

grown = 0
for quiz in q['quizzes']:
    extras = NEW_QUESTIONS.get(quiz['id'])
    if extras:
        existing = {qq['id'] for qq in quiz['questions']}
        for nq in extras:
            if nq['id'] not in existing:
                quiz['questions'].append(nq)
                grown += 1

# ---- Capstone quiz (new entry, lessonId null-safe: use module-9 anchor id) ----
if not any(x['id'] == 'capstone-final' for x in q['quizzes']):
    q['quizzes'].append({
        "id": "capstone-final",
        "title": "Final Capstone: Everything You've Learned",
        "lessonId": "lesson-9-3",
        "description": "A mixed review covering all nine modules. Aim for 80% or higher!",
        "questions": [
            {"id":"cap-q1","type":"multiple-choice","question":"Which data type would you choose to store a student's name and grade together, looked up by name?","options":["A list","A tuple","A dictionary","A set"],"correctAnswer":2,"concept":"dictionaries"},
            {"id":"cap-q2","type":"fill-blank","question":"Write the missing word: scores = [80, 92, 77]; highest = ___(scores)","concept":"lists","correctAnswer":["max"]},
            {"id":"cap-q3","type":"true-false","question":"A for loop can iterate directly over the characters of a string.","correctAnswer":True,"concept":"for-loop"},
            {"id":"cap-q4","type":"multiple-choice","question":"What will this print? def f(x): return x * 2; print(f(f(3)))","options":["12","6","9","36"],"correctAnswer":0,"concept":"functions"},
            {"id":"cap-q5","type":"fill-blank","question":"To read a number safely from user text you convert it: age = ___(input())","concept":"input","correctAnswer":["int","int()"]},
            {"id":"cap-q6","type":"multiple-choice","question":"Which block runs whether or not an exception occurred?","options":["finally","else","except","raise"],"correctAnswer":0,"concept":"exceptions"},
            {"id":"cap-q7","type":"true-false","question":"Tuples can be modified after creation using append().","correctAnswer":False,"concept":"tuples"},
            {"id":"cap-q8","type":"fill-blank","question":"In a class, ___ refers to the current instance.","concept":"oop","correctAnswer":["self"]},
            {"id":"cap-q9","type":"multiple-choice","question":"Which mode opens a file WITHOUT erasing existing content, adding to the end instead?","options":["\"a\"","\"w\"","\"r\"","\"x\""],"correctAnswer":0,"concept":"files"},
            {"id":"cap-q10","type":"fill-blank","question":"Convert a saved JSON file back into Python data: data = json.___(open('save.json'))","concept":"json","correctAnswer":["load"]}
        ]
    })
    print("Capstone added")

with open('content/quizzes.json', 'w') as f:
    json.dump(q, f, indent=2, ensure_ascii=False)
print(f"Grown questions added: {grown}")

# ============ PART 3: Parsons exercises for modules 4-9 ============
PARSONS = {
"lesson-4-2": {
    "id": "ex-4-2-p", "type": "parsons",
    "prompt": "Arrange the lines into a function that greets a person with a custom title.",
    "blocks": ["def greet(title, name):", "    full = title + \" \" + name", "    return full", "message = greet(\"Dr.\", \"Cruz\")", "print(message)"],
    "correct_order": [0, 1, 2, 3, 4],
    "distractor_blocks": ["greet(\"Dr.\", \"Cruz\")"],
    "difficulty": "medium", "concept": "functions"
},
"lesson-4-3": {
    "id": "ex-4-3-p", "type": "parsons",
    "prompt": "Build code that computes and returns the area of a rectangle, then uses it.",
    "blocks": ["def area(width, height):", "    result = width * height", "    return result", "a = area(5, 4)", "print(a)"],
    "correct_order": [0, 1, 2, 3, 4],
    "difficulty": "easy", "concept": "return-values"
},
"lesson-5-1": {
    "id": "ex-5-1-p", "type": "parsons",
    "prompt": "Arrange the steps: create a list, add an item, sort it, then show it.",
    "blocks": ["fruits = [\"banana\", \"apple\"]", "fruits.append(\"cherry\")", "fruits.sort()", "print(fruits)"],
    "correct_order": [0, 1, 2, 3],
    "difficulty": "easy", "concept": "list-methods"
},
"lesson-5-3": {
    "id": "ex-5-3-p", "type": "parsons",
    "prompt": "Arrange the lines to create a dictionary and look up a value safely.",
    "blocks": ["student = {\"name\": \"Ana\", \"grade\": 91}", "name = student.get(\"name\")", "print(name)", "# prints: Ana"],
    "correct_order": [0, 1, 2, 3],
    "distractor_blocks": ["student = [\"Ana\", 91]"],
    "difficulty": "medium", "concept": "dictionaries"
},
"lesson-6-1": {
    "id": "ex-6-1-p", "type": "parsons",
    "prompt": "Arrange these lines to import and use a function from the math module.",
    "blocks": ["import math", "result = math.sqrt(25)", "print(result)"],
    "correct_order": [0, 1, 2],
    "distractor_blocks": ["result = sqrt(25)"],
    "difficulty": "easy", "concept": "imports"
},
"lesson-7-2": {
    "id": "ex-7-2-p", "type": "parsons",
    "prompt": "Arrange the lines to write two lines of text to a file.",
    "blocks": ["with open(\"notes.txt\", \"w\") as f:", "    f.write(\"Line one\\n\")", "    f.write(\"Line two\\n\")", "print(\"Saved!\")"],
    "correct_order": [0, 1, 2, 3],
    "difficulty": "medium", "concept": "files"
},
"lesson-8-2": {
    "id": "ex-8-2-p", "type": "parsons",
    "prompt": "Arrange a safe number-conversion with error handling.",
    "blocks": ["try:", "    age = int(input(\"Age: \"))", "except ValueError:", "    print(\"Please type digits only.\")"],
    "correct_order": [0, 1, 2, 3],
    "distractor_blocks": ["except:"],
    "difficulty": "medium", "concept": "exceptions"
},
"lesson-9-1": {
    "id": "ex-9-1-p", "type": "parsons",
    "prompt": "Build a class with an initializer and a method, then create an object.",
    "blocks": ["class Student:", "    def __init__(self, name):", "        self.name = name", "    def say_hi(self):", "        return f\"Hi, {self.name}!\"", "s = Student(\"Ana\")", "print(s.say_hi())"],
    "correct_order": [0, 1, 2, 3, 4, 5, 6],
    "difficulty": "hard", "concept": "oop"
},
}

added_p = []
for m in d['modules']:
    for l in m['lessons']:
        p = PARSONS.get(l['id'])
        if p:
            ids = {e['id'] for e in (l.get('exercises') or [])}
            if p['id'] not in ids:
                l.setdefault('exercises', []).append(p)
                added_p.append(l['id'])

with open('content/lessons.json', 'w') as f:
    json.dump(d, f, indent=2, ensure_ascii=False)
print("Parsons added to:", added_p)
