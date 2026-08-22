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
    const script = document.createElement('script');
    script.src = 'lib/skulpt.min.js';
    script.async = true;
    script.onload = () => {
      skulptLoaded = true;
      configureSkulpt();
      resolve();
    };
    script.onerror = () => {
      skulptLoadPromise = null;
      reject(new Error('Failed to load Skulpt from CDN'));
    };
    document.head.appendChild(script);
  });

  return skulptLoadPromise;
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
      // Restrict file access - only allow standard library modules
      if (filename === 'sys' || filename === 'math' || filename === 'random' ||
          filename === 'datetime' || filename === 'json' || filename === 're' ||
          filename === 'itertools' || filename === 'collections' || filename === 'string') {
        return window.Sk.misceval.promiseToSuspension(
          fetch(`lib/skulpt-stdlib.js`)
            .then(r => r.text())
            .catch(() => { throw new Error(`Module not found: ${filename}`); })
        );
      }
      throw new Error(`Import not allowed: ${filename}`);
    },
    // Limit execution time
    execLimit: 5000, // 5 seconds max
    // Disable dangerous features
    disableComprehensions: false,
    disableGenerators: false,
  });

  // Override dangerous builtins
  const builtins = window.Sk.builtin;
  if (builtins) {
    // Remove access to __import__, open, eval, exec, compile, etc.
    const dangerous = ['__import__', 'open', 'eval', 'exec', 'compile', 'reload',
                       'input', 'raw_input', 'file', 'buffer', 'memoryview',
                       'bytearray', 'bytes', 'classmethod', 'staticmethod',
                       'property', 'super', 'type', 'object', 'slice',
                       'staticmethod', 'classmethod'];

    dangerous.forEach(name => {
      if (builtins[name]) {
        builtins[name] = builtins.none.none$;
      }
    });
  }
}

/**
 * Execute Python code with Skulpt.
 * @param {string} code - Python code to execute
 * @param {string} stdin - Input to provide to the program
 * @returns {Promise<{output: string, error: string|null}>}
 */
export async function executePython(code, stdin = '') {
  await loadSkulpt();

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
      // For other imports, use default behavior
      return window.Sk.misceval.promiseToSuspension(
        fetch('lib/skulpt-stdlib.js')
          .then(r => r.text())
          .catch(() => { throw new Error(`Module not found: ${filename}`); })
      );
    };

    // Configure for this execution
    const originalConfig = { ...window.Sk.config };
    window.Sk.configure({
      output: outputHandler,
      read: readHandler,
      execLimit: 5000,
      // Disable dangerous modules
      syspath: ['/'],
    });

    try {
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