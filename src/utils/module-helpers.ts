import { pathToFileURL } from 'url';

/**
 * 判断当前模块是否直接通过命令行执行（而非被导入）
 */
export function isMainModule(metaUrl: string): boolean {
  const entry = process.argv[1];
  if (!metaUrl || !entry) {
    return false;
  }

  try {
    return metaUrl === pathToFileURL(entry).href;
  } catch {
    return false;
  }
}
