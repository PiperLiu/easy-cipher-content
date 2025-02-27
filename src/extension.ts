import * as vscode from "vscode";
import { encryptionServiceFactory } from "./encryption";
import { FileManager } from "./fileManager";
import { isTextFile } from "./utils";

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("easy-cipher-content");
  const encryptionService = encryptionServiceFactory(config ?? {});
  const fileManager = new FileManager(encryptionService, config);

  let encryptDisposable = vscode.commands.registerCommand(
    "easy-cipher-content.encrypt",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
        const filePath = document.uri.fsPath;

        if (isTextFile(filePath, config)) {
          // Handle text file encryption
          const text = document.getText();
          const lines = text.split(/\r?\n/);
          const encryptedLines = await Promise.all(
            lines.map(async (line) => {
              if (line.trim() === "") {
                return line;
              }
              const encrypted = await encryptionService.encryptText(line);
              return Buffer.from(encrypted.data).toString("base64");
            })
          );

          editor.edit((editBuilder) => {
            const range = new vscode.Range(
              document.positionAt(0),
              document.positionAt(text.length)
            );
            editBuilder.replace(range, encryptedLines.join("\n"));
          });
        } else {
          // Handle binary file encryption
          await fileManager.encryptFile(document.uri);
          vscode.window.showInformationMessage(`File encrypted: ${filePath}.enc`);
        }
      }
    }
  );

  let decryptDisposable = vscode.commands.registerCommand(
    "easy-cipher-content.decrypt",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
        const filePath = document.uri.fsPath;

        if (isTextFile(filePath, config)) {
          // Handle text file decryption
          const text = document.getText();
          const lines = text.split(/\r?\n/);
          const decryptedLines = await Promise.all(
            lines.map(async (line, index) => {
              if (line.trim() === "") {
                return line;
              }

              try {
                const buffer = Buffer.from(line, "base64");
                return await encryptionService.decryptText(buffer);
              } catch (e) {
                // If this is the first error we encounter, it might be due to wrong password
                if (index === lines.findIndex((l) => l.trim() !== "")) {
                  throw new Error("Invalid password");
                }
                // Otherwise, just return the original line
                return line;
              }
            })
          );

          editor.edit((editBuilder) => {
            const range = new vscode.Range(
              document.positionAt(0),
              document.positionAt(text.length)
            );
            editBuilder.replace(range, decryptedLines.join("\n"));
          });
        } else {
          // Handle binary file decryption
          if (filePath.endsWith('.enc')) {
            await fileManager.decryptFile(document.uri);
            vscode.window.showInformationMessage(`File decrypted: ${filePath.slice(0, -4)}`);
          } else {
            vscode.window.showErrorMessage(
              "This doesn't appear to be an encrypted binary file (.enc extension expected)"
            );
          }
        }
      }
    }
  );

  let encryptWorkspaceDisposable = vscode.commands.registerCommand(
    "easy-cipher-content.encryptWorkspace",
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const rootPath = workspaceFolders[0].uri;
        await fileManager.processWorkspace(rootPath, "encrypt");
      } else {
        vscode.window.showErrorMessage("No workspace folder is open");
      }
    }
  );

  let decryptWorkspaceDisposable = vscode.commands.registerCommand(
    "easy-cipher-content.decryptWorkspace",
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const rootPath = workspaceFolders[0].uri;
        await fileManager.processWorkspace(rootPath, "decrypt");
      } else {
        vscode.window.showErrorMessage("No workspace folder is open");
      }
    }
  );

  context.subscriptions.push(encryptDisposable);
  context.subscriptions.push(decryptDisposable);
  context.subscriptions.push(encryptWorkspaceDisposable);
  context.subscriptions.push(decryptWorkspaceDisposable);
}

export function deactivate() { }
