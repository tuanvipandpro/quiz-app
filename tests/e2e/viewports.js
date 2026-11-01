const cases = [
  { project: 'phone', width: 320, height: 844, language: 'vi', theme: 'dark' },
  { project: 'phone', width: 390, height: 844, language: 'en', theme: 'light' },
  { project: 'phone', width: 412, height: 915, language: 'en', theme: 'dark' },
  { project: 'desktop', width: 768, height: 1024, language: 'vi', theme: 'light' },
  { project: 'desktop', width: 1280, height: 900, language: 'en', theme: 'light' },
  { project: 'phone', width: 844, height: 390, language: 'vi', theme: 'dark' },
];

export function viewportCases(project) {
  if (!['desktop', 'phone'].includes(project))
    throw new Error(`Unknown browser project: ${project}`);
  return cases.filter((item) => item.project === project);
}

// Keep all EN/VN × light/dark states in each input mode after splitting widths.
// Add only missing combinations at one representative viewport.
export function accountCases(project) {
  const selected = viewportCases(project);
  for (const language of ['en', 'vi']) {
    for (const theme of ['light', 'dark']) {
      if (!selected.some((item) => item.language === language && item.theme === theme))
        selected.push({ ...selected[0], language, theme });
    }
  }
  return selected;
}
