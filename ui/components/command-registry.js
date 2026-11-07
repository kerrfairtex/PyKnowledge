/**
 * Command registry — plain array of {id,label,keywords,run}.
 * Adding an action = adding one entry. No framework.
 */
export const commands = [
  { id: 'nav-dashboard', label: 'Go to Dashboard', keywords: 'home missions modules',
    run: () => { window.location.hash = '#/dashboard'; } },
  { id: 'nav-progress', label: 'Go to Progress', keywords: 'stats achievements telemetry',
    run: () => { window.location.hash = '#/progress'; } },
  { id: 'nav-library', label: 'Go to Library', keywords: 'reference glossary cheat sheets',
    run: () => { window.location.hash = '#/library'; } },
  { id: 'nav-about', label: 'Go to About', keywords: 'info credits tracy barmm ched',
    run: () => { window.location.hash = '#/about'; } },
  { id: 'nav-landing', label: 'Back to Landing Page', keywords: 'home exit top',
    run: () => { window.location.hash = '#top'; } },
  { id: 'fx-off', label: 'FX: Off (no effects)', keywords: 'motion reduce disable effects',
    run: (api) => { api.setFx('off'); } },
  { id: 'fx-lite', label: 'FX: Lite (scanlines, glow)', keywords: 'motion effects light',
    run: (api) => { api.setFx('lite'); } },
  { id: 'fx-full', label: 'FX: Full (glitch, rain)', keywords: 'motion effects max glitch rain',
    run: (api) => { api.setFx('full'); api.setRainTier && api.setRainTier('full'); } },
  { id: 'rain-on', label: 'Rain: On (full)', keywords: 'matrix rain background on full',
    run: (api) => { api.setRainTier && api.setRainTier('full'); } },
  { id: 'rain-off', label: 'Rain: Off', keywords: 'matrix rain background off disable',
    run: (api) => { api.setRainTier && api.setRainTier('off'); } },
  { id: 'rain-lite', label: 'Rain: Lite (dim, 12fps)', keywords: 'matrix rain background lite dim',
    run: (api) => { api.setRainTier && api.setRainTier('lite'); } },
  { id: 'theme-green', label: 'Theme: Green (default)', keywords: 'color scheme terminal',
    run: (api) => { api.setTheme('green'); } },
  { id: 'theme-amber', label: 'Theme: Amber', keywords: 'color scheme warm retro',
    run: (api) => { api.setTheme('amber'); } },
  { id: 'theme-ice', label: 'Theme: Ice', keywords: 'color scheme cool blue',
    run: (api) => { api.setTheme('ice'); } }
];
