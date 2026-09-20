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
        resolve();
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