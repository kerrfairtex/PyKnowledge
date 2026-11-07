/**
 * Simple Python syntax highlighter.
 * Converts Python code string to HTML with syntax spans.
 * No dependencies, works inline.
 */
export function highlightPython(code) {
  // Escape HTML first
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Comment (single line) — must be done before strings
  html = html.replace(/(#[^\n]*)/g, '<span class="syn-comment">$1</span>');

  // Triple-quoted strings (multi-line)
  html = html.replace(/(&quot;&quot;&quot;[\s\S]*?&quot;&quot;&quot;|"""[\s\S]*?"""|'''(?:[^']|'(?!'')|''(?!'))*''')/g, '<span class="syn-string">$1</span>');

  // Strings (single and double quoted)
  html = html.replace(/(&quot;(?:[^&"]|&(?!quot;))*&quot;|'(?:[^'\\]|\\.)*')/g, '<span class="syn-string">$1</span>');

  // F-string prefix detection
  html = html.replace(/\b(f([&quot;']))/g, '<span class="syn-fstring">$1</span>');

  // Numbers (int, float)
  html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="syn-number">$1</span>');

  // Keywords
  const keywords = [
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
    'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
    'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
    'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return',
    'try', 'while', 'with', 'yield'
  ];
  const kwPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
  html = html.replace(kwPattern, '<span class="syn-keyword">$1</span>');

  // Built-in functions
  const builtins = [
    'print', 'input', 'len', 'range', 'type', 'int', 'str', 'float',
    'bool', 'list', 'dict', 'set', 'tuple', 'sorted', 'enumerate',
    'zip', 'reversed', 'any', 'all', 'sum', 'min', 'max', 'abs',
    'round', 'open', 'super', 'isinstance', 'hasattr', 'getattr'
  ];
  const biPattern = new RegExp(`\\b(${builtins.join('|')})\\b`, 'g');
  html = html.replace(biPattern, '<span class="syn-builtin">$1</span>');

  // Decorators (@)
  html = html.replace(/(@\w+)/g, '<span class="syn-decorator">$1</span>');

  return html;
}

/**
 * Apply syntax highlighting to a pre/code block.
 */
export function applyHighlighting(element) {
  const code = element.textContent || element.innerText;
  element.innerHTML = highlightPython(code);
}