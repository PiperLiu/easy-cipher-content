import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Determines if a file is a text file based on its extension
 */
export function isTextFile(filePath: string, config: vscode.WorkspaceConfiguration): boolean {
  const textFileExtensions = config.get<string[]>('textFileExtensions', []);
  const extension = path.extname(filePath).toLowerCase();
  return textFileExtensions.includes(extension);
}

/**
 * Gets the target file path for encryption/decryption
 */
export function getTargetFilePath(filePath: string, operation: 'encrypt' | 'decrypt'): string {
  if (operation === 'encrypt' && !filePath.endsWith('.enc')) {
    return filePath + '.enc';
  } else if (operation === 'decrypt' && filePath.endsWith('.enc')) {
    return filePath.slice(0, -4); // Remove .enc extension
  }
  return filePath;
}

/**
 * Parses ignore patterns from the ignore file
 */
export async function parseIgnoreFile(rootPath: vscode.Uri): Promise<string[]> {
  try {
    const config = vscode.workspace.getConfiguration('easy-cipher-content');
    const ignoreFileName = config.get<string>('ignoreFile', '.easy-cipher-content-ignore');
    const ignoreFilePath = vscode.Uri.joinPath(rootPath, ignoreFileName);

    try {
      const fileContent = await vscode.workspace.fs.readFile(ignoreFilePath);
      return Buffer.from(fileContent)
        .toString('utf-8')
        .split(/\r?\n/)
        .filter(line => line.trim() !== '' && !line.startsWith('#'))
        .map(line => line.trim());
    } catch (error) {
      // Ignore file doesn't exist, return default ignores
      return [
        'node_modules/**',
        '.git/**',
        '**/*.enc', // Don't re-encrypt already encrypted files
        '.vscode/**'
      ];
    }
  } catch (error) {
    console.error('Error parsing ignore file:', error);
    return [];
  }
}

/**
 * Check if a file should be ignored based on patterns
 */
export function shouldIgnore(filePath: string, ignorePatterns: string[]): boolean {
  // Simple implementation of glob pattern matching
  return ignorePatterns.some(pattern => {
    if (pattern.endsWith('/**')) {
      const dirPattern = pattern.slice(0, -3);
      return filePath.startsWith(dirPattern);
    } else if (pattern.startsWith('**/*.')) {
      const ext = pattern.slice(3);
      return filePath.endsWith(ext);
    } else if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(path.basename(filePath));
    }
    return filePath.includes(pattern);
  });
}
