const vm = require("vm");

/**
 * Runs a single JS function (defined in `code`) against one set of arguments,
 * inside a fresh, restricted VM context with a timeout. This is NOT bulletproof
 * sandboxing (Node's vm module can be escaped by determined attackers), but it's
 * a reasonable, well-scoped safeguard for a college project where the "attacker"
 * is, at worst, a classmate submitting silly code — not a real security boundary
 * for a public production judge system with untrusted strangers.
 *
 * @param {string} code - student or instructor's JS source defining the function
 * @param {string} functionName - name of the function to call
 * @param {Array} args - arguments to call the function with
 * @param {number} timeoutMs
 * @returns {{ success: boolean, result?: any, error?: string }}
 */
function runJsFunction(code, functionName, args, timeoutMs = 1500) {
  try {
    const context = vm.createContext({
      console: { log: () => {}, error: () => {}, warn: () => {} }, // swallow logs, don't crash on them
    });

    const script = new vm.Script(code, { timeout: timeoutMs });
    script.runInContext(context, { timeout: timeoutMs });

    if (typeof context[functionName] !== "function") {
      return { success: false, error: `No function named "${functionName}" was found in the code.` };
    }

    const callScript = new vm.Script(
      `__result__ = ${functionName}(...__args__);`
    );
    context.__args__ = args;
    callScript.runInContext(context, { timeout: timeoutMs });

    return { success: true, result: context.__result__ };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/* ------------------------------------------------------------------
 * Real Python / Java execution via Piston (https://github.com/engineer-man/piston)
 * Piston is a free, public, sandboxed code execution API — no API key, no
 * install required. This is what actually gives Python/Java a "live" runner,
 * since Node's `vm` module (used above for JS) can't run other languages.
 *
 * Assignments in these languages are "stdio style": the student's program
 * reads input from stdin and prints the answer to stdout, and we compare
 * stdout (trimmed) against the expected output — the same model LeetCode-
 * clones and most online judges use for non-JS languages.
 * ------------------------------------------------------------------ */

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

const PISTON_RUNTIMES = {
  python: { language: "python", version: "3.10.0", filename: "main.py" },
  java: { language: "java", version: "15.0.2", filename: "Main.java" },
};

/**
 * Executes `sourceCode` in the given language with `stdin` fed to the program.
 * Returns { success, stdout, stderr, error }.
 */
async function runPistonCode(language, sourceCode, stdin = "", timeoutMs = 8000) {
  const runtime = PISTON_RUNTIMES[language];
  if (!runtime) return { success: false, error: `Unsupported language: ${language}` };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(PISTON_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [{ name: runtime.filename, content: sourceCode }],
        stdin: stdin || "",
      }),
    });

    if (!res.ok) {
      return { success: false, error: `Code execution service returned ${res.status}.` };
    }

    const data = await res.json();

    // Compile errors (Java) show up here before the program ever runs
    if (data.compile && data.compile.code !== 0) {
      return { success: false, error: data.compile.stderr || "Compilation failed.", stdout: "", stderr: data.compile.stderr || "" };
    }

    const run = data.run || {};
    return { success: true, stdout: run.stdout || "", stderr: run.stderr || "", timedOut: run.signal === "SIGKILL" };
  } catch (err) {
    if (err.name === "AbortError") {
      return { success: false, error: "Execution timed out." };
    }
    return { success: false, error: `Could not reach the code execution service: ${err.message}` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs stdio-style test cases (Python/Java) — each test case is
 * { input: "<stdin text>", expectedOutput: "<expected stdout text>" }.
 * Trailing whitespace is ignored when comparing, since students' print
 * statements almost always differ from the reference solution by a
 * trailing newline or two.
 */
async function runTestCasesStdio(language, sourceCode, testCases, timeoutMs = 8000) {
  const results = [];
  for (const tc of testCases) {
    const run = await runPistonCode(language, sourceCode, String(tc.input ?? ""), timeoutMs);
    if (!run.success) {
      results.push({ input: tc.input, expectedOutput: tc.expectedOutput, actualOutput: null, passed: false, error: run.error || run.stderr });
      continue;
    }
    const actual = (run.stdout || "").trim();
    const expected = String(tc.expectedOutput ?? "").trim();
    const passed = actual === expected && !run.stderr;
    results.push({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      actualOutput: run.stdout,
      passed,
      error: run.stderr || null,
    });
  }
  return results;
}

/**
 * Runs `code` against every test case and reports pass/fail per case.
 * testCases: [{ input: [...args], expectedOutput: <value> }]
 */
function runTestCases(code, functionName, testCases, timeoutMs = 1500) {
  return testCases.map((tc) => {
    const run = runJsFunction(code, functionName, tc.input, timeoutMs);
    if (!run.success) {
      return { input: tc.input, expectedOutput: tc.expectedOutput, actualOutput: null, passed: false, error: run.error };
    }
    const passed = deepEqual(run.result, tc.expectedOutput);
    return { input: tc.input, expectedOutput: tc.expectedOutput, actualOutput: run.result, passed, error: null };
  });
}

module.exports = { runJsFunction, runTestCases, deepEqual, runPistonCode, runTestCasesStdio };
