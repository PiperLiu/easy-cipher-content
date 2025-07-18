import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';
import { EncryptionService } from 'easy-cipher-mate';
import { TextEncoding } from 'easy-cipher-mate/lib/utils/encodingUtils';

const execAsync = promisify(exec);

/**
 * The context now holds the result of the diff computation.
 */
export interface EncryptionContext {
  isNewFile: boolean;
  isGitRepo: boolean;
  /**
   * A map where the key is the new line number (1-based) and the value is the original encrypted line content.
   * If a line number is present in this map, it means the line is unchanged and should not be re-encrypted.
   */
  unchangedLinesMap: Map<number, string>;
}

export class GitDiffService {
  private isGitRepository: boolean = false;
  private workspacePath: string | null = null;
  private initializationPromise: Promise<void> | null = null;

  constructor(private workspaceFolder?: vscode.WorkspaceFolder) {
    // Initialization is done lazily when a method requires it.
  }

  /**
   * Lazily initializes the git repository status. This prevents multiple initializations.
   */
  private initializeGitRepository(): Promise<void> {
    if (!this.initializationPromise) {
      this.initializationPromise = (async () => {
        try {
          if (!this.workspaceFolder) {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
              this.workspaceFolder = workspaceFolders[0];
            }
          }

          if (!this.workspaceFolder) {
            this.isGitRepository = false;
            return;
          }

          this.workspacePath = this.workspaceFolder.uri.fsPath;

          // A quiet git command to check if we are inside a git repository.
          await execAsync('git rev-parse --is-inside-work-tree', { cwd: this.workspacePath });
          this.isGitRepository = true;
        } catch {
          this.isGitRepository = false;
        }
      })();
    }
    return this.initializationPromise;
  }

  /**
   * Get git context for a specific file, primarily checking if it's a new, untracked file.
   */
  private async getGitContext(filePath: string): Promise<{ isNewFile: boolean }> {
    const result = { isNewFile: false };

    if (!this.isGitRepository || !this.workspacePath) {
      result.isNewFile = true;
      return result;
    }

    try {
      const relativePath = vscode.workspace.asRelativePath(filePath, false);
      // This command will error if the file is not tracked by Git.
      await execAsync(`git ls-files --error-unmatch "${relativePath}"`, { cwd: this.workspacePath });
    } catch {
      // If the command errors, the file is not tracked, hence it's "new".
      result.isNewFile = true;
    }

    return result;
  }

  /**
   * Get the original encrypted content from git HEAD.
   */
  private async getOriginalEncryptedContent(filePath: string): Promise<string[]> {
    if (!this.isGitRepository || !this.workspacePath) {
      return [];
    }

    try {
      const relativePath = vscode.workspace.asRelativePath(filePath, false);
      const { stdout } = await execAsync(`git show HEAD:"${relativePath}"`, { cwd: this.workspacePath });
      return stdout.split(/\r?\n/);
    } catch (error) {
      // This is expected if the file is new.
      return [];
    }
  }

  /**
   * Decrypts an array of lines. Failed decryptions are handled gracefully to not break the diff.
   */
  private async decryptLines(lines: string[], encryptionService: EncryptionService<any, any>, encoding: string): Promise<string[]> {
    try {
      return await Promise.all(
        lines.map(async (line) => {
          if (line.trim() === "") {
            return line;
          }
          try {
            const buffer = Buffer.from(line, 'base64');
            return await encryptionService.decryptText(buffer, encoding as TextEncoding);
          } catch (e) {
            // If a line fails to decrypt, it can't be part of a common subsequence.
            // Return a unique string to ensure it doesn't match any real content.
            return `DECRYPTION_FAILED_${crypto.randomUUID()}`;
          }
        })
      );
    } catch (error) {
      console.warn('Failed to decrypt original content:', error);
      return [];
    }
  }

  /**
   * Implements the Longest Common Subsequence algorithm to find common lines between two files.
   * @returns An array of pairs `[originalIndex, newIndex]` for each common line.
   */
  private findLCS(original: string[], current: string[]): Array<[number, number]> {
    const m = original.length;
    const n = current.length;
    const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (original[i - 1] === current[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const lcsIndices: Array<[number, number]> = [];
    let i = m;
    let j = n;
    while (i > 0 && j > 0) {
      if (original[i - 1] === current[j - 1]) {
        lcsIndices.unshift([i - 1, j - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    return lcsIndices;
  }

  /**
   * Create encryption context for git-diff-aware encryption.
   * This is the main method that orchestrates the diffing process.
   */
  public async createEncryptionContext(
    filePath: string,
    currentContent: string,
    encryptionService: EncryptionService<any, any>,
    encoding: string = 'utf-8'
  ): Promise<EncryptionContext> {
    await this.initializeGitRepository();

    const gitContext = await this.getGitContext(filePath);
    const unchangedLinesMap = new Map<number, string>();

    if (!this.isGitRepository || gitContext.isNewFile) {
      return {
        isNewFile: gitContext.isNewFile,
        isGitRepo: this.isGitRepository,
        unchangedLinesMap,
      };
    }

    const originalEncryptedLines = await this.getOriginalEncryptedContent(filePath);
    if (originalEncryptedLines.length === 0) {
      return { isNewFile: true, isGitRepo: this.isGitRepository, unchangedLinesMap };
    }

    const originalDecryptedLines = await this.decryptLines(originalEncryptedLines, encryptionService, encoding);
    const currentDecryptedLines = currentContent.split(/\r?\n/);

    if (originalDecryptedLines.length === 0) {
      return { isNewFile: true, isGitRepo: this.isGitRepository, unchangedLinesMap };
    }

    const lcs = this.findLCS(originalDecryptedLines, currentDecryptedLines);

    for (const [originalIndex, newIndex] of lcs) {
      unchangedLinesMap.set(newIndex + 1, originalEncryptedLines[originalIndex]);
    }

    return {
      isNewFile: gitContext.isNewFile,
      isGitRepo: this.isGitRepository,
      unchangedLinesMap,
    };
  }

  /**
   * Determine if a line should be re-encrypted based on the pre-computed context.
   */
  public shouldReEncryptLine(lineNumber: number, context: EncryptionContext): boolean {
    if (!context.isGitRepo || context.isNewFile) {
      return true;
    }
    return !context.unchangedLinesMap.has(lineNumber);
  }

  /**
   * Get the original encrypted line if it should not be re-encrypted.
   */
  public getOriginalEncryptedLine(lineNumber: number, context: EncryptionContext): string | null {
    if (this.shouldReEncryptLine(lineNumber, context)) {
      return null;
    }
    return context.unchangedLinesMap.get(lineNumber) ?? null;
  }

  /**
   * Get git repository status.
   */
  public getIsGitRepository(): boolean {
    return this.isGitRepository;
  }
}
