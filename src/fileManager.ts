import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
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

  /**
   * Process specific file or directory based on provided path
   */
  async processSpecificPath(
    inputPath: string,
    operation: 'encrypt' | 'decrypt',
    workspaceRoot: vscode.Uri
  ): Promise<boolean> {
    try {
      // Normalize the path and resolve relative paths
      let fullPath = inputPath.trim();

      // Check if the path is absolute
      if (!path.isAbsolute(fullPath)) {
        // If relative, resolve against the workspace root
        fullPath = path.join(workspaceRoot.fsPath, fullPath);
      }

      const fileUri = vscode.Uri.file(fullPath);

      // Check if the path exists
      try {
        const stat = await vscode.workspace.fs.stat(fileUri);

        if (stat.type === vscode.FileType.File) {
          // Process single file
          if (isTextFile(fullPath, this.config)) {
            await this.processTextFile(fileUri, operation);
          } else if (operation === 'encrypt') {
            await this.encryptFile(fileUri);
          } else if (fullPath.endsWith('.enc')) {
            await this.decryptFile(fileUri);
          } else {
            vscode.window.showWarningMessage(
              `Skipping non-encrypted file: ${fullPath}`
            );
            return false;
          }

          vscode.window.showInformationMessage(`Successfully ${operation === 'encrypt' ? 'encrypted' : 'decrypted'}: ${fullPath}`);
          return true;
        } else if (stat.type === vscode.FileType.Directory) {
          // Process directory
          const ignorePatterns = await parseIgnoreFile(workspaceRoot);

          return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `${operation === 'encrypt' ? 'Encrypting' : 'Decrypting'} files in ${fullPath}...`,
            cancellable: true
          }, async (progress, token) => {
            let processedCount = 0;
            const incrementProgress = () => {
              processedCount++;
              progress.report({ message: `Processed ${processedCount} files` });
            };

            await this.processDirectory(fileUri, operation, ignorePatterns, incrementProgress, token);

            vscode.window.showInformationMessage(
              `${operation === 'encrypt' ? 'Encrypted' : 'Decrypted'} ${processedCount} files in ${fullPath}`
            );
            return true;
          });
        } else {
          vscode.window.showErrorMessage(`Unsupported file type for path: ${fullPath}`);
          return false;
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Path does not exist or cannot be accessed: ${fullPath}`);
        return false;
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error processing path ${inputPath}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Get suggestions for paths in the current workspace
   */
  private async getPathSuggestions(workspaceRoot: vscode.Uri, includeFiles: boolean = true): Promise<string[]> {
    const suggestions: string[] = [];

    if (!workspaceRoot) {
      return suggestions;
    }

    try {
      // Add root workspace folder
      suggestions.push('.');

      // Get top-level directories and optionally files
      const entries = await vscode.workspace.fs.readDirectory(workspaceRoot);

      for (const [name, type] of entries) {
        // Skip hidden files/directories
        if (name.startsWith('.')) {
          continue;
        }

        // Add directories
        if (type === vscode.FileType.Directory) {
          suggestions.push(name);

          // Add some common subdirectories
          try {
            const subDirUri = vscode.Uri.joinPath(workspaceRoot, name);
            const subEntries = await vscode.workspace.fs.readDirectory(subDirUri);

            for (const [subName, subType] of subEntries) {
              if (subType === vscode.FileType.Directory && !subName.startsWith('.')) {
                suggestions.push(path.join(name, subName));
              }
            }
          } catch (err) {
            // Skip if we can't read the subdirectory
          }
        }
        // Add files if requested
        else if (includeFiles && type === vscode.FileType.File) {
          suggestions.push(name);
        }
      }

      // Sort suggestions
      return suggestions.sort();
    } catch (error) {
      console.error('Error getting path suggestions:', error);
      return suggestions;
    }
  }

  /**
   * Handle multiple paths in a session with path suggestions
   */
  async processMultiplePaths(
    operation: 'encrypt' | 'decrypt',
    workspaceRoot: vscode.Uri
  ): Promise<void> {
    let continueSession = true;
    const pathSuggestions = await this.getPathSuggestions(workspaceRoot);

    while (continueSession) {
      // Use QuickPick instead of InputBox for better UX with suggestions
      const quickPick = vscode.window.createQuickPick();
      quickPick.placeholder = `Enter path to ${operation} (relative to workspace or absolute)`;
      quickPick.title = `Select or enter path to ${operation === 'encrypt' ? 'encrypt' : 'decrypt'}`;
      quickPick.items = pathSuggestions.map(p => ({ label: p }));
      quickPick.canSelectMany = false;
      quickPick.ignoreFocusOut = true;

      // Add custom input option
      quickPick.items = [
        { label: '$(edit) Enter custom path...', description: 'Type a custom path not in the suggestions' },
        { label: '$(folder) Browse...', description: 'Select a folder or file using the file explorer' },
        { kind: vscode.QuickPickItemKind.Separator, label: 'Suggested paths:' },
        ...quickPick.items
      ];

      // Show the QuickPick
      quickPick.show();

      const selection = await new Promise<string | undefined>(resolve => {
        quickPick.onDidAccept(() => {
          const selected = quickPick.selectedItems[0];

          if (selected) {
            if (selected.label === '$(edit) Enter custom path...') {
              quickPick.dispose();
              // Show input box instead
              vscode.window.showInputBox({
                prompt: `Enter path to ${operation} (relative to workspace or absolute)`,
                placeHolder: 'e.g., src/data or /Users/username/project/data',
                ignoreFocusOut: true
              }).then(resolve);
            } else if (selected.label === '$(folder) Browse...') {
              quickPick.dispose();
              // Show file picker
              vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: `Select to ${operation}`
              }).then(uris => {
                if (uris && uris.length > 0) {
                  // Convert absolute path to relative if possible
                  const absolutePath = uris[0].fsPath;
                  const relativePath = vscode.workspace.asRelativePath(absolutePath);
                  resolve(relativePath);
                } else {
                  resolve(undefined);
                }
              });
            } else {
              resolve(selected.label);
              quickPick.dispose();
            }
          } else {
            resolve(undefined);
            quickPick.dispose();
          }
        });

        quickPick.onDidHide(() => {
          resolve(undefined);
          quickPick.dispose();
        });
      });

      if (!selection) {
        // User canceled
        continueSession = false;
        continue;
      }

      await this.processSpecificPath(selection, operation, workspaceRoot);

      // Ask if the user wants to continue
      const continueResponse = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: `Process another path with ${operation} operation?`
      });

      if (continueResponse !== 'Yes') {
        continueSession = false;
      }
    }
  }
}
