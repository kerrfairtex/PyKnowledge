/**
 * Python executor using Skulpt (in-browser Python interpreter).
 * Provides sandboxed Python execution for write_code exercises.
 */

let skulptLoaded = false;
let skulptLoadPromise = null;

/**
 * Load Skulpt library dynamically.
 * Returns a promise that resolves when Skulpt is ready.
 */
function loadSkulpt() {
  if (skulptLoaded) return Promise.resolve();
  if (skulptLoadPromise) return skulptLoadPromise;

  skulptLoadPromise = new Promise((resolve, reject) => {
    // Check if Skulpt is already available globally
    if (typeof window !== 'undefined' && window.Sk) {
      skulptLoaded = true;
      resolve();
      return;
    }

    // Load Skulpt from locally vendored copy (works fully offline).
    // Vendored from npm skulpt@1.2.0, dist sha256:
    //   skulpt.min.js     1a319d8eedf314dba5af2444313e3cf2ac072a335df0f5100277e8f49b64eae9
    //   skulpt-stdlib.js  e3ecccbc17c6164d19ed3c5561aaaeb752c38c8efa2d88b62b5fb7a7e1b086a7
    // (skulpt@1.3.0 does not exist on npm — the previous CDN URL returned 404.)
    //
    // BOTH files are required and order matters:
    //   1. skulpt.min.js    — the interpreter (defines window.Sk)
    //   2. skulpt-stdlib.js — the standard library registry (Sk.builtinFiles,
    //      including $builtinmodule used by every builtin). Without it ANY
    //      code, even print(), dies with "ReferenceError: $builtinmodule".
    const loadScript = (src) => new Promise((res, rej) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = res;
      script.onerror = () => rej(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });

    loadScript('lib/skulpt.min.js')
      .then(() => loadScript('lib/skulpt-stdlib.js'))
      .then(() => {
        skulptLoaded = true;
        configureSkulpt();
        installCompat(window.Sk).then(() => resolve());
      })
      .catch(() => {
        skulptLoadPromise = null;
        reject(new Error('Failed to load Skulpt — the Python runtime is unavailable'));
      });
  });

  return skulptLoadPromise;
}

/**
 * Resolve a module request against the Sk.builtinFiles registry.
 * Skulpt requests several forms ("sys", "sys.js", "src/builtin/sys.js")
 * depending on import path — try them all.
 */
function resolveBuiltinSource(filename) {
  if (window.Sk.builtinFiles && window.Sk.builtinFiles.files) {
    const files = window.Sk.builtinFiles.files;
    const candidates = [
      filename,
      `src/builtin/${filename}`,
      `src/builtin/${filename}.js`,
      `${filename}.js`,
    ];
    for (const c of candidates) {
      if (files[c] !== undefined) return files[c];
    }
  }
  return null;
}

/**
 * Configure Skulpt with restricted builtins for safety.
 */
function configureSkulpt() {
  if (!window.Sk) return;

  // Configure Skulpt settings
  window.Sk.configure({
    output: (text) => { /* handled per-execution */ },
    read: (filename) => {
      // Serve stdlib module source from the loaded Sk.builtinFiles registry
      // (skulpt-stdlib.js must have been executed as a script — see loadSkulpt).
      const src = resolveBuiltinSource(filename);
      if (src !== null) return src;
      throw new Error(`Import not allowed: ${filename}`);
    },
    // Limit execution time
    execLimit: 5000, // 5 seconds max
    // Disable dangerous features
    disableComprehensions: false,
    disableGenerators: false,
  });

  // Sandbox note: execution is constrained by execLimit (5s) and the read()
  // whitelist above (only Sk.builtinFiles sources are served — no fetch of
  // arbitrary URLs, no filesystem). Blanket-replacing builtins (open/file/type/
  // object/super...) is NOT safe here: Skulpt's own stdlib constructs
  // Sk.builtin.file internally, so nulling them crashes even print().
}

/**
 * Execute Python code with Skulpt.
 * @param {string} code - Python code to execute
 * @param {string} stdin - Input to provide to the program
 * @returns {Promise<{output: string, error: string|null}>}
 */
export async function executePython(code, stdin = '') {
  await loadSkulpt();
  await compatPromise;
  resetVirtualFiles();

  return new Promise((resolve) => {
    if (!window.Sk) {
      resolve({ output: '', error: 'Skulpt not loaded' });
      return;
    }

    let output = '';
    const stdinBuffer = stdin;
    let stdinIndex = 0;

    // Custom output handler
    const outputHandler = (text) => {
      output += text;
    };

    // Custom read handler for stdin
    const readHandler = (filename) => {
      if (filename === 'stdin') {
        return window.Sk.misceval.promiseToSuspension(
          new Promise((res) => {
            // Return one character at a time to simulate interactive input
            if (stdinIndex < stdinBuffer.length) {
              const char = stdinBuffer[stdinIndex++];
              res(char);
            } else {
              res('\x04'); // EOF
            }
          })
        );
      }
      // For other imports: serve from the builtinFiles registry
      const src = resolveBuiltinSource(filename);
      if (src !== null) return src;
      throw new Error(`Module not found: ${filename}`);
    };

    // input(): feed test stdin line by line when provided; otherwise ask the user.
    const stdinLines = stdinBuffer.split('\n');
    if (stdinLines.length && stdinLines[stdinLines.length - 1] === '') stdinLines.pop();
    let lineIndex = 0;
    const interactive = stdinBuffer === '';
    const inputHandler = (promptText) => {
      if (interactive) {
        output += promptText || '';
        const typed = window.prompt(promptText || '');
        if (typed === null) throw new window.Sk.builtin.EOFError('EOF when reading a line');
        return typed;
      }
      if (lineIndex < stdinLines.length) return stdinLines[lineIndex++];
      throw new window.Sk.builtin.EOFError('EOF when reading a line');
    };

    // Configure for this execution
    const originalConfig = { ...window.Sk.config };
    window.Sk.configure({
      output: outputHandler,
      read: readHandler,
      inputfun: inputHandler,
      inputfunTakesPrompt: true,
      execLimit: 5000,
      // Disable dangerous modules
      syspath: ['/'],
    });

    try {
      applyCompatBuiltins();
      // Execute the code
      const promise = window.Sk.misceval.asyncToPromise(() => {
        return window.Sk.importMainWithBody('<stdin>', false, code, true);
      });

      promise.then(
        () => {
          // Restore config
          window.Sk.configure(originalConfig);
          resolve({ output, error: null });
        },
        (err) => {
          // Restore config
          window.Sk.configure(originalConfig);
          const errorMsg = err.toString();
          resolve({ output, error: errorMsg });
        }
      );
    } catch (err) {
      window.Sk.configure(originalConfig);
      resolve({ output, error: err.toString() });
    }
  });
}

/**
 * Check if Python execution is available (Skulpt loaded).
 */
export function isPythonAvailable() {
  return skulptLoaded || (typeof window !== 'undefined' && window.Sk);
}

/**
 * Preload Skulpt for faster first execution.
 */
export function preloadPython() {
  return loadSkulpt();
}

// ---------------------------------------------------------------------------
// Compatibility layer for Skulpt 1.2.0. Fills gaps so lesson exercises can be
// answered offline: `statistics`, a working `json`, an in-memory `open()`
// (never touches the real disk) and Python-style float printing.
// A failure here never blocks the runtime.
// ---------------------------------------------------------------------------
let compatPromise = Promise.resolve();
let compatBuiltins = {};
let compatReset = null;

const PY_STATISTICS = String.raw`import math

class StatisticsError(ValueError):
    pass

def _items(data, message):
    values = list(data)
    if len(values) == 0:
        raise StatisticsError(message)
    return values

def mean(data):
    values = _items(data, 'mean requires at least one data point')
    n = len(values)
    total = sum(values)
    if isinstance(total, int) and total % n == 0:
        return total // n
    return total / n

def fmean(data):
    values = _items(data, 'fmean requires at least one data point')
    return sum(values) / len(values)

def median(data):
    values = sorted(_items(data, 'no median for empty data'))
    n = len(values)
    mid = n // 2
    if n % 2 == 1:
        return values[mid]
    return (values[mid - 1] + values[mid]) / 2

def median_low(data):
    values = sorted(_items(data, 'no median for empty data'))
    n = len(values)
    if n % 2 == 1:
        return values[n // 2]
    return values[n // 2 - 1]

def median_high(data):
    values = sorted(_items(data, 'no median for empty data'))
    return values[len(values) // 2]

def multimode(data):
    values = list(data)
    if len(values) == 0:
        return []
    counts = {}
    for v in values:
        counts[v] = counts.get(v, 0) + 1
    best = max(counts.values())
    result = []
    for v in values:
        if counts[v] == best and v not in result:
            result.append(v)
    return result

def mode(data):
    modes = multimode(data)
    if len(modes) == 0:
        raise StatisticsError('no mode for empty data')
    return modes[0]

def pvariance(data, mu=None):
    values = _items(data, 'pvariance requires at least one data point')
    if mu is None:
        mu = sum(values) / len(values)
    return sum((x - mu) ** 2 for x in values) / len(values)

def variance(data, xbar=None):
    values = list(data)
    n = len(values)
    if n < 2:
        raise StatisticsError('variance requires at least two data points')
    if xbar is None:
        xbar = sum(values) / n
    return sum((x - xbar) ** 2 for x in values) / (n - 1)

def pstdev(data, mu=None):
    return math.sqrt(pvariance(data, mu))

def stdev(data, xbar=None):
    return math.sqrt(variance(data, xbar))
`;

const PY_FS = String.raw`try:
    _OSError = OSError
except NameError:
    _OSError = IOError

try:
    FileNotFoundError
except NameError:
    class FileNotFoundError(_OSError):
        pass

_files = {}

def reset():
    _files.clear()

class _File:
    def __init__(self, name, mode):
        self.name = name
        self.mode = mode
        self.closed = False
        self._pos = 0
        self._data = ''
        if mode == 'r':
            if name not in _files:
                raise FileNotFoundError("[Errno 2] No such file or directory: '" + str(name) + "'")
            self._data = _files[name]
        elif mode == 'w':
            _files[name] = ''
        elif mode == 'a':
            if name not in _files:
                _files[name] = ''
        else:
            raise ValueError("this practice environment supports modes 'r', 'w' and 'a' only")

    def _need_open(self):
        if self.closed:
            raise ValueError('I/O operation on closed file.')

    def readable(self):
        return self.mode == 'r'

    def writable(self):
        return self.mode != 'r'

    def write(self, text):
        self._need_open()
        if self.mode == 'r':
            raise _OSError('not writable')
        if not isinstance(text, str):
            raise TypeError('write() argument must be str, not ' + type(text).__name__)
        _files[self.name] = _files[self.name] + text
        return len(text)

    def writelines(self, lines):
        for line in lines:
            self.write(line)

    def read(self, size=-1):
        self._need_open()
        if self.mode != 'r':
            raise _OSError('not readable')
        if size is None or size < 0:
            end = len(self._data)
        else:
            end = min(len(self._data), self._pos + size)
        text = self._data[self._pos:end]
        self._pos = end
        return text

    def readline(self):
        self._need_open()
        if self.mode != 'r':
            raise _OSError('not readable')
        data = self._data
        if self._pos >= len(data):
            return ''
        end = data.find('\n', self._pos)
        if end == -1:
            end = len(data)
        else:
            end = end + 1
        line = data[self._pos:end]
        self._pos = end
        return line

    def readlines(self):
        lines = []
        while True:
            line = self.readline()
            if line == '':
                break
            lines.append(line)
        return lines

    def flush(self):
        pass

    def close(self):
        self.closed = True

    def __iter__(self):
        return self

    def __next__(self):
        line = self.readline()
        if line == '':
            raise StopIteration
        return line

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.close()
        return False

def open(file, mode='r', encoding=None, **kwargs):
    mode = mode.replace('t', '')
    return _File(file, mode)
`;

const PY_JSON = String.raw`class JSONDecodeError(ValueError):
    pass

_ESCAPES = {
    '"': '\\"',
    '\\': '\\\\',
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    chr(8): '\\b',
    chr(12): '\\f',
}

_UNESCAPES = {'"': '"', '\\': '\\', '/': '/', 'b': chr(8), 'f': chr(12), 'n': '\n', 'r': '\r', 't': '\t'}

def _hex4(n):
    digits = '0123456789abcdef'
    return digits[(n >> 12) & 15] + digits[(n >> 8) & 15] + digits[(n >> 4) & 15] + digits[n & 15]

def _quote(s, ensure_ascii):
    out = ['"']
    for ch in s:
        if ch in _ESCAPES:
            out.append(_ESCAPES[ch])
        else:
            code = ord(ch)
            if code < 32 or (ensure_ascii and code > 126):
                out.append('\\u' + _hex4(code & 65535))
            else:
                out.append(ch)
    out.append('"')
    return ''.join(out)

def _number(o):
    if isinstance(o, int):
        return str(o)
    if o != o:
        return 'NaN'
    if o == float('inf'):
        return 'Infinity'
    if o == float('-inf'):
        return '-Infinity'
    return repr(o)

def _key(k, ensure_ascii):
    if isinstance(k, str):
        return _quote(k, ensure_ascii)
    if isinstance(k, bool):
        return _quote('true' if k else 'false', ensure_ascii)
    if k is None:
        return _quote('null', ensure_ascii)
    if isinstance(k, (int, float)):
        return _quote(_number(k), ensure_ascii)
    raise TypeError('keys must be str, int, float, bool or None, not ' + type(k).__name__)

def _join(open_ch, close_ch, parts, indent, level, item_sep):
    if indent is None:
        return open_ch + item_sep.join(parts) + close_ch
    pad = '\n' + ' ' * (indent * (level + 1))
    end = '\n' + ' ' * (indent * level)
    return open_ch + pad + (item_sep + pad).join(parts) + end + close_ch

def _encode(o, indent, level, sort_keys, ensure_ascii, item_sep, key_sep):
    if o is None:
        return 'null'
    if isinstance(o, bool):
        return 'true' if o else 'false'
    if isinstance(o, str):
        return _quote(o, ensure_ascii)
    if isinstance(o, (int, float)):
        return _number(o)
    if isinstance(o, (list, tuple)):
        if len(o) == 0:
            return '[]'
        parts = []
        for v in o:
            parts.append(_encode(v, indent, level + 1, sort_keys, ensure_ascii, item_sep, key_sep))
        return _join('[', ']', parts, indent, level, item_sep)
    if isinstance(o, dict):
        if len(o) == 0:
            return '{}'
        keys = list(o.keys())
        if sort_keys:
            keys = sorted(keys)
        parts = []
        for k in keys:
            parts.append(_key(k, ensure_ascii) + key_sep + _encode(o[k], indent, level + 1, sort_keys, ensure_ascii, item_sep, key_sep))
        return _join('{', '}', parts, indent, level, item_sep)
    raise TypeError('Object of type ' + type(o).__name__ + ' is not JSON serializable')

def dumps(obj, indent=None, sort_keys=False, separators=None, ensure_ascii=True, **kwargs):
    if separators is not None:
        item_sep = separators[0]
        key_sep = separators[1]
    elif indent is None:
        item_sep = ', '
        key_sep = ': '
    else:
        item_sep = ','
        key_sep = ': '
    return _encode(obj, indent, 0, sort_keys, ensure_ascii, item_sep, key_sep)

def dump(obj, fp, **kwargs):
    fp.write(dumps(obj, **kwargs))

class _Parser:
    def __init__(self, text):
        self.s = text
        self.i = 0

    def error(self, message):
        raise JSONDecodeError(message + ': line 1 column ' + str(self.i + 1) + ' (char ' + str(self.i) + ')')

    def skip(self):
        s = self.s
        while self.i < len(s) and s[self.i] in ' \t\n\r':
            self.i += 1

    def value(self):
        self.skip()
        s = self.s
        if self.i >= len(s):
            self.error('Expecting value')
        ch = s[self.i]
        if ch == '{':
            return self.obj()
        if ch == '[':
            return self.arr()
        if ch == '"':
            return self.string()
        if s[self.i:self.i + 4] == 'true':
            self.i += 4
            return True
        if s[self.i:self.i + 5] == 'false':
            self.i += 5
            return False
        if s[self.i:self.i + 4] == 'null':
            self.i += 4
            return None
        return self.number()

    def obj(self):
        result = {}
        self.i += 1
        self.skip()
        if self.s[self.i:self.i + 1] == '}':
            self.i += 1
            return result
        while True:
            self.skip()
            if self.s[self.i:self.i + 1] != '"':
                self.error('Expecting property name enclosed in double quotes')
            key = self.string()
            self.skip()
            if self.s[self.i:self.i + 1] != ':':
                self.error("Expecting ':' delimiter")
            self.i += 1
            result[key] = self.value()
            self.skip()
            ch = self.s[self.i:self.i + 1]
            if ch == ',':
                self.i += 1
                continue
            if ch == '}':
                self.i += 1
                return result
            self.error("Expecting ',' delimiter")

    def arr(self):
        result = []
        self.i += 1
        self.skip()
        if self.s[self.i:self.i + 1] == ']':
            self.i += 1
            return result
        while True:
            result.append(self.value())
            self.skip()
            ch = self.s[self.i:self.i + 1]
            if ch == ',':
                self.i += 1
                continue
            if ch == ']':
                self.i += 1
                return result
            self.error("Expecting ',' delimiter")

    def string(self):
        s = self.s
        self.i += 1
        out = []
        while True:
            if self.i >= len(s):
                self.error('Unterminated string starting at')
            ch = s[self.i]
            if ch == '"':
                self.i += 1
                return ''.join(out)
            if ch == '\\':
                nxt = s[self.i + 1:self.i + 2]
                if nxt == 'u':
                    out.append(chr(int(s[self.i + 2:self.i + 6], 16)))
                    self.i += 6
                    continue
                if nxt not in _UNESCAPES:
                    self.error('Invalid escape')
                out.append(_UNESCAPES[nxt])
                self.i += 2
                continue
            out.append(ch)
            self.i += 1

    def number(self):
        s = self.s
        start = self.i
        j = start
        if s[j:j + 1] == '-':
            j += 1
        while j < len(s) and s[j] in '0123456789':
            j += 1
        is_float = False
        if s[j:j + 1] == '.':
            is_float = True
            j += 1
            while j < len(s) and s[j] in '0123456789':
                j += 1
        if s[j:j + 1] in ('e', 'E'):
            is_float = True
            j += 1
            if s[j:j + 1] in ('+', '-'):
                j += 1
            while j < len(s) and s[j] in '0123456789':
                j += 1
        text = s[start:j]
        if text == '' or text == '-':
            self.error('Expecting value')
        self.i = j
        if is_float:
            return float(text)
        return int(text)

def loads(s, **kwargs):
    if not isinstance(s, str):
        raise TypeError('the JSON object must be str, not ' + type(s).__name__)
    p = _Parser(s)
    value = p.value()
    p.skip()
    if p.i != len(s):
        p.error('Extra data')
    return value

def load(fp, **kwargs):
    return loads(fp.read(), **kwargs)
`;

// Python prints the shortest text that round-trips (98.6, 0.30000000000000004);
// Skulpt prints 16 digits (98.59999999999999, 0.3). Match Python.
function pythonFloatRepr(x) {
  if (x === 0) return Object.is(x, -0) ? '-0.0' : '0.0';
  const abs = Math.abs(x);
  if (abs >= 1e16 || abs < 1e-4) {
    return x.toExponential().replace(/e([+-])(\d)$/, (m, sign, digit) => 'e' + sign + '0' + digit);
  }
  const text = String(x);
  return text.indexOf('.') === -1 ? text + '.0' : text;
}

function patchFloatPrinting(Sk) {
  const proto = Sk.builtin && Sk.builtin.float_ && Sk.builtin.float_.prototype;
  if (!proto || typeof proto.str$ !== 'function' || proto.pykPatched) return;
  const original = proto.str$;
  proto.str$ = function (base, sign) {
    const orig = original.call(this, base, sign);
    if ((base !== undefined && base !== 10) || !Number.isFinite(this.v)) return orig;
    const isText = typeof orig === 'string';
    const origText = isText ? orig : orig && orig.v;
    if (typeof origText !== 'string') return orig;
    const text = (origText.charAt(0) === '-' ? '-' : '') + pythonFloatRepr(Math.abs(this.v));
    return isText ? text : new Sk.builtin.str(text);
  };
  proto.pykPatched = true;
}

function installCompat(Sk) {
  compatPromise = (async () => {
    try {
      const files = Sk.builtinFiles && Sk.builtinFiles.files;
      if (!files) return;
      // Skulpt's own json is a stub that throws NotImplementedError: remove it.
      for (const key of Object.keys(files)) {
        if (/(^|\/)json(\/__init__)?(\$py)?\.(js|py)$/.test(key)) delete files[key];
      }
      files['src/lib/json.py'] = PY_JSON;
      files['src/lib/statistics.py'] = PY_STATISTICS;
      files['src/lib/pyk_fs.py'] = PY_FS;

      patchFloatPrinting(Sk);

      const mod = await Sk.misceval.asyncToPromise(() => Sk.importModule('pyk_fs', false, true));
      compatBuiltins = { open: mod.$d.open };
      if (mod.$d.FileNotFoundError) compatBuiltins.FileNotFoundError = mod.$d.FileNotFoundError;
      compatReset = mod.$d.reset;
    } catch (e) {
      console.warn('[python-executor] compatibility layer not fully installed:', e);
    }
  })();
  return compatPromise;
}

// Sk.configure() can rebuild the builtins table, so re-apply before every run.
function applyCompatBuiltins() {
  const Sk = window.Sk;
  if (!Sk || !Sk.builtins) return;
  for (const name of Object.keys(compatBuiltins)) Sk.builtins[name] = compatBuiltins[name];
}

// Every run starts with an empty virtual disk.
function resetVirtualFiles() {
  try {
    if (compatReset && window.Sk) window.Sk.misceval.callsimArray(compatReset, []);
  } catch (e) { /* ignore */ }
}

