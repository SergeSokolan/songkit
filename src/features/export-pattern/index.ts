import { parsePattern, type Pattern } from '../../entities/drum-pattern';
import { downloadFile } from '../../shared/lib/download';
import { encodeMidi } from './model/midi';
export { encodeMidi } from './model/midi';
export function exportMidi(pattern: Pattern) {
  downloadFile(encodeMidi(pattern), 'songkit.mid', 'audio/midi');
}
export function exportProject(pattern: Pattern) {
  downloadFile(JSON.stringify(pattern, null, 2), 'songkit.json', 'application/json');
}
export async function importProject(file: File): Promise<Pattern> {
  if (file.size > 1024 * 1024) throw new Error('Файл больше 1 МБ');
  return parsePattern(JSON.parse(await file.text()));
}
