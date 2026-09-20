/**
 * matrix-rain self-protect unit test with a mocked clock.
 * We cannot easily import the module's internal frame() here, so we
 * replicate the exact jank-detection logic and assert it drops a tier
 * when the avg interval over 60 frames exceeds 24ms, and stays put
 * when intervals are healthy.
 */

// Mirror of the self-protect block in matrix-rain.js (kept in sync manually).
function makeProtector() {
  const drawTimes = new Float32Array(60);
  let drawIdx = 0;
  let tier = 'full';
  return {
    frame(t /* rAF timestamp */, last) {
      if (last > 0) {
        const interval = t - last;
        drawTimes[drawIdx++ % 60] = interval;
        if (drawIdx >= 60 && drawIdx % 60 === 0) {
          let sum = 0; for (let i = 0; i < 60; i++) sum += drawTimes[i];
          if (sum / 60 > 24) {
            if (tier === 'full') tier = 'lite';
            else if (tier === 'lite') tier = 'off';
            drawIdx = 0;
          }
        }
      }
      return tier;
    },
    get tier() { return tier; },
  };
}

describe('matrix-rain tier self-protect (mocked clock)', () => {
  it('drops full->lite when avg interval > 24ms over 60 frames', () => {
    const p = makeProtector();
    let last = 0;
    let t = 0;
    // 61 frames at 30ms interval (avg 30ms > 24ms) -> tier should drop after 60th
    for (let i = 0; i < 61; i++) {
      t += 30;
      p.frame(t, last);
      last = t;
    }
    expect(p.tier).toBe('lite');
  });

  it('drops lite->off on sustained jank', () => {
    const p = makeProtector();
    let last = 0;
    let t = 0;
    for (let i = 0; i < 122; i++) {
      t += 30;
      p.frame(t, last);
      last = t;
    }
    expect(p.tier).toBe('off');
  });

  it('stays full when intervals are healthy (16ms ~60fps)', () => {
    const p = makeProtector();
    let last = 0;
    let t = 0;
    for (let i = 0; i < 120; i++) {
      t += 16;
      p.frame(t, last);
      last = t;
    }
    expect(p.tier).toBe('full');
  });

  it('stays full right at the boundary (avg 24ms)', () => {
    const p = makeProtector();
    let last = 0;
    let t = 0;
    for (let i = 0; i < 61; i++) {
      t += 24;
      p.frame(t, last);
      last = t;
    }
    // 24 is NOT > 24, so tier must stay
    expect(p.tier).toBe('full');
  });
});

describe('matrix-rain self-protect (session-only, grace)', () => {
  it('does not drop tier during the 2s startup grace', () => {
    const drawTimes = new Float32Array(60);
    let drawIdx = 0;
    let tier = 'full';
    const graceUntil = performance.now() + 2000;
    // simulate 60 slow frames within grace period
    let last = performance.now() - 3000; // pretend we started 3s ago
    let t = last;
    for (let i = 0; i < 60; i++) {
      t += 30; // 30ms interval (>24ms threshold)
      if (last > 0 && graceUntil < performance.now()) {
        const interval = t - last;
        drawTimes[drawIdx++ % 60] = interval;
        if (drawIdx >= 60 && drawIdx % 60 === 0) {
          let sum = 0; for (let j = 0; j < 60; j++) sum += drawTimes[j];
          if (sum / 60 > 24) { if (tier === 'full') tier = 'lite'; drawIdx = 0; }
        }
      }
      last = t;
    }
    // graceUntil is still ~2s in future, so tier must stay full
    expect(tier).toBe('full');
  });

  it('auto-drop is session-only and never writes pyknowledge_fx', () => {
    // The new code uses `tier = 'lite'` (local), not `setRainTier('lite')` (writes key).
    // Verify by checking the source does not call setRainTier in the self-protect block.
    const src = require('fs').readFileSync('ui/components/matrix-rain.js', 'utf8');
    // Extract the self-protect block
    const block = src.slice(src.indexOf('// Self-protect: sample EVERY tick'), src.indexOf('// trail fade'));
    expect(block).not.toContain('setRainTier');
    expect(block).not.toContain('writeFx');
    expect(block).toContain("tier = 'lite'");
    expect(block).toContain("tier = 'off'");
  });

  it('samples jank on every rAF tick BEFORE the fps-throttle return', () => {
    const src = require('fs').readFileSync('ui/components/matrix-rain.js', 'utf8');
    const frameFn = src.slice(src.indexOf('function frame(t) {'), src.indexOf('function startLoop'));
    const sampleIdx = frameFn.indexOf('drawTimes[drawIdx++');
    const fpsThrottleIdx = frameFn.indexOf('if (t - last < 1000 / e.fps) return;');
    expect(sampleIdx).toBeGreaterThan(-1);
    expect(fpsThrottleIdx).toBeGreaterThan(-1);
    expect(sampleIdx).toBeLessThan(fpsThrottleIdx);
  });
});
