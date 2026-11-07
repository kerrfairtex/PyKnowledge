import { readFileSync } from 'fs';

function makeProtector() {
  const drawTimes = new Float32Array(60);
  let drawIdx = 0;
  let tier = 'full';
  return {
    frame(t, last) {
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

describe('matrix-rain self-protect (mocked clock)', () => {
  it('drops full->lite when avg interval > 24ms over 60 frames', () => {
    const p = makeProtector();
    let last = 0;
    let t = 0;
    for (let i = 0; i < 61; i++) { t += 30; p.frame(t, last); last = t; }
    expect(p.tier).toBe('lite');
  });
  it('drops lite->off on sustained jank', () => {
    const p = makeProtector();
    let last = 0; let t = 0;
    for (let i = 0; i < 122; i++) { t += 30; p.frame(t, last); last = t; }
    expect(p.tier).toBe('off');
  });
  it('stays full when intervals are healthy', () => {
    const p = makeProtector();
    let last = 0; let t = 0;
    for (let i = 0; i < 120; i++) { t += 16; p.frame(t, last); last = t; }
    expect(p.tier).toBe('full');
  });
  it('stays full at boundary (avg 24ms)', () => {
    const p = makeProtector();
    let last = 0; let t = 0;
    for (let i = 0; i < 61; i++) { t += 24; p.frame(t, last); last = t; }
    expect(p.tier).toBe('full');
  });
});

describe('matrix-rain self-protect (source checks)', () => {
  const src = readFileSync('ui/components/matrix-rain.js', 'utf8');
  const frameFn = src.slice(src.indexOf('function frame(t) {'), src.indexOf('function startLoop'));

  it('auto-drop uses local tier = (not setRainTier/writeFx)', () => {
    expect(frameFn).not.toContain('setRainTier');
    expect(frameFn).not.toContain('writeFx');
    expect(frameFn).toContain("tier = 'lite'");
    expect(frameFn).toContain("tier = 'off'");
  });

  it('samples jank BEFORE fps-throttle return', () => {
    const sampleIdx = frameFn.indexOf('drawTimes[drawIdx++');
    const fpsIdx = frameFn.indexOf('if (t - last < 1000 / e.fps) return;');
    expect(sampleIdx).toBeGreaterThan(-1);
    expect(sampleIdx).toBeLessThan(fpsIdx);
  });

  it('sets performance.mark(rain-init) on start', () => {
    expect(src).toContain("performance.mark('rain-init')");
  });

  it('resets jank window on visibilitychange', () => {
    const v = src.slice(src.indexOf("addEventListener('visibilitychange'"));
    expect(v).toContain('drawIdx = 0');
  });

  it('resets jank window on hashchange', () => {
    const h = src.slice(src.indexOf("addEventListener('hashchange'"));
    expect(h).toContain('drawIdx = 0');
  });
});
