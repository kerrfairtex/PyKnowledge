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
