import * as vscode from 'vscode';
import * as path from 'path';
import ignore from 'ignore';

/**
 * Determines if a file is a text file based on its extension
 */
export function isTextFile(filePath: string, config: vscode.WorkspaceConfiguration): boolean {
  const textFileExtensions = config.get<string[]>('textFileExtensions', []);
  const extension = path.extname(filePath).toLowerCase();
  return textFileExtensions.includes(extension) || textFileExtensions.includes(path.basename(filePath));
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
  const ig = ignore().add(ignorePatterns);
  return ig.ignores(filePath);
}

/**
 * Maps VS Code encodings to TextEncoding supported by easy-cipher-mate
 */
export function mapVSCodeEncodingToTextEncoding(encoding?: string): { supported: boolean; encoding?: string } {
  if (!encoding) {
    return { supported: true, encoding: 'utf-8' }; // Default to UTF-8
  }

  // Map VS Code encodings to TextEncoding values supported by easy-cipher-mate
  const encodingMap: Record<string, string> = {
    'utf8': 'utf-8',
    'utf-8': 'utf-8',
    'ascii': 'ascii',
    'utf16le': 'utf16le',
    'base64': 'base64',
    'hex': 'hex',
    'latin1': 'latin1',
    'binary': 'binary'
  };

  const supportedEncoding = encodingMap[encoding.toLowerCase()];

  return {
    supported: !!supportedEncoding,
    encoding: supportedEncoding
  };
}

/**
 * Gets the encoding of a text document
 */
export function getDocumentEncoding(document: vscode.TextDocument): string {
  const config = vscode.workspace.getConfiguration('files', document.uri);
  return config.get<string>('encoding', 'utf8');
}
