export type EntryView = 'editor' | 'guide' | 'welcome';

export function readEntryView(): EntryView | null {
  const view = new URL(window.location.href).searchParams.get('view');
  return view === 'editor' || view === 'guide' || view === 'welcome' ? view : null;
}

export function entryHref(view: EntryView): string {
  return `${import.meta.env.BASE_URL}?view=${view}`;
}

export function alreadyOpenedEditor(): boolean {
  try {
    return localStorage.getItem('songkit.openedEditor') === '1';
  } catch {
    return false;
  }
}

export function rememberEditorVisit(): void {
  try {
    localStorage.setItem('songkit.openedEditor', '1');
  } catch {
    // The explicit editor URL also works when storage is blocked.
  }
}
