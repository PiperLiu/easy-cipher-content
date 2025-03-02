import * as vscode from 'vscode';
import { EncryptionService } from 'easy-cipher-mate';
import { isTextFile, getTargetFilePath, parseIgnoreFile, shouldIgnore, mapVSCodeEncodingToTextEncoding } from './utils';

export class FileManager {
  private encryptionService: EncryptionService<any, any>;
  private config: vscode.WorkspaceConfiguration;

  constructor(encryptionService: EncryptionService<any, any>, config: vscode.WorkspaceConfiguration) {
    this.encryptionService = encryptionService;
    this.config = config;
  }

  /**
   * Encrypt a single file (binary)
   */
  async encryptFile(fileUri: vscode.Uri): Promise<void> {
    try {
      const fileBuffer = await vscode.workspace.fs.readFile(fileUri);
      if (fileBuffer.length === 0) {
        vscode.window.showWarningMessage(`Empty file: ${fileUri.fsPath}, skipping encryption.`);
        return;
      }
      const encrypted = await this.encryptionService.encryptFile(
        fileBuffer.buffer
      );

      // Write encrypted data to the .enc file
      const targetPath = vscode.Uri.file(getTargetFilePath(fileUri.fsPath, 'encrypt'));
      await vscode.workspace.fs.writeFile(targetPath, new Uint8Array(encrypted.data));

      // Delete original file if configured to do so
      const deleteOriginal = this.config.get<boolean>('deleteOriginalAfterEncryption', true);
      if (deleteOriginal) {
        await vscode.workspace.fs.delete(fileUri);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error encrypting file: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Decrypt a single file (binary)
   */
  async decryptFile(fileUri: vscode.Uri): Promise<void> {
    try {
      const encryptedBuffer = await vscode.workspace.fs.readFile(fileUri);
      const decrypted = await this.encryptionService.decryptFile(encryptedBuffer.buffer);

      // Write decrypted data to file without .enc extension
      const targetPath = vscode.Uri.file(getTargetFilePath(fileUri.fsPath, 'decrypt'));
      await vscode.workspace.fs.writeFile(targetPath, new Uint8Array(decrypted));

      // Delete encrypted file if configured to do so
      const deleteOriginal = this.config.get<boolean>('deleteOriginalAfterEncryption', true);
      if (deleteOriginal) {
        await vscode.workspace.fs.delete(fileUri);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error decrypting file: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Process text content of a file
   */
  async processTextFile(fileUri: vscode.Uri, operation: 'encrypt' | 'decrypt', encoding?: string): Promise<void> {
    try {
      // Check if the encoding is supported
      const encodingResult = mapVSCodeEncodingToTextEncoding(encoding);
      if (!encodingResult.supported) {
        vscode.window.showWarningMessage(`Encoding '${encoding}' is not supported for encryption/decryption. Using UTF-8 instead.`);
        // Continue with UTF-8 as fallback
      }

      const fileContent = await vscode.workspace.fs.readFile(fileUri);
      // Use document encoding if provided, otherwise detect from file content
      const text = Buffer.from(fileContent).toString(encodingResult.encoding as BufferEncoding || 'utf-8');
      const lines = text.split(/\r?\n/);

      const processedLines = await Promise.all(
        lines.map(async (line) => {
          if (line.trim() === "") {
            return line;
          }

          if (operation === 'encrypt') {
            const encrypted = await this.encryptionService.encryptText(line, encodingResult.encoding as any);
            return Buffer.from(encrypted.data).toString('base64');
          } else {
            try {
              const buffer = Buffer.from(line, 'base64');
              return await this.encryptionService.decryptText(buffer, encodingResult.encoding as any);
            } catch (e) {
              // If failed to decrypt, return original line
              return line;
            }
          }
        })
      );

      const processedContent = processedLines.join('\n');
      await vscode.workspace.fs.writeFile(fileUri, Buffer.from(processedContent, encodingResult.encoding as BufferEncoding || 'utf-8'));
    } catch (error) {
      vscode.window.showErrorMessage(`Error processing text file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Process workspace files recursively
   */
  async processWorkspace(rootPath: vscode.Uri, operation: 'encrypt' | 'decrypt'): Promise<void> {
    const ignorePatterns = await parseIgnoreFile(rootPath);

    return vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `${operation === 'encrypt' ? 'Encrypting' : 'Decrypting'} workspace files...`,
      cancellable: true
    }, async (progress, token) => {
      try {
        let processedCount = 0;
        const incrementProgress = () => {
          processedCount++;
          progress.report({ message: `Processed ${processedCount} files` });
        };

        await this.processDirectory(rootPath, operation, ignorePatterns, incrementProgress, token);

        vscode.window.showInformationMessage(
          `${operation === 'encrypt' ? 'Encrypted' : 'Decrypted'} ${processedCount} files successfully.`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Error during ${operation} operation: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  /**
   * Process a directory recursively
   */
  private async processDirectory(
    dirUri: vscode.Uri,
    operation: 'encrypt' | 'decrypt',
    ignorePatterns: string[],
    incrementProgress: () => void,
    token: vscode.CancellationToken
  ): Promise<void> {
    if (token.isCancellationRequested) {
      return;
    }

    if (dirUri !== vscode.workspace.workspaceFolders![0].uri) {
      const relativePath = vscode.workspace.asRelativePath(dirUri, false);
      if (shouldIgnore(relativePath, ignorePatterns)) {
        return;
      }
    }

    const entries = await vscode.workspace.fs.readDirectory(dirUri);

    for (const [name, type] of entries) {
      if (token.isCancellationRequested) {
        return;
      }

      const entryPath = vscode.Uri.joinPath(dirUri, name);
      const relPath = vscode.workspace.asRelativePath(entryPath);

      if (shouldIgnore(relPath, ignorePatterns)) {
        continue;
      }

      if (type === vscode.FileType.Directory) {
        await this.processDirectory(entryPath, operation, ignorePatterns, incrementProgress, token);
      } else if (type === vscode.FileType.File) {
        // Handle file based on type and operation
        const filePath = entryPath.fsPath;

        if (operation === 'encrypt') {
          // For encryption
          if (isTextFile(filePath, this.config)) {
            await this.processTextFile(entryPath, 'encrypt');
          } else {
            await this.encryptFile(entryPath);
          }
        } else {
          // For decryption
          if (filePath.endsWith('.enc')) {
            if (isTextFile(filePath.slice(0, -4), this.config)) {
              // This is a bit tricky - we need to decrypt the content and save without .enc
              await this.decryptFile(entryPath);
            } else {
              await this.decryptFile(entryPath);
            }
          } else if (isTextFile(filePath, this.config)) {
            await this.processTextFile(entryPath, 'decrypt');
          }
          // Skip binary files without .enc extension
        }

        incrementProgress();
      }
    }
  }
}
