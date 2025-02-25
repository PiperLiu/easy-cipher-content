import * as vscode from "vscode";
import { encryptionServiceFactory } from "./encryption";

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("easy-cipher-content");

  const encryptionService = encryptionServiceFactory(config ?? {});

  let encryptDisposable = vscode.commands.registerCommand(
    "easy-cipher-content.encrypt",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
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
      }
    }
  );

  let decryptDisposable = vscode.commands.registerCommand(
    "easy-cipher-content.decrypt",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
        const text = document.getText();
        const lines = text.split(/\r?\n/);
        const encryptedLines = await Promise.all(
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
          editBuilder.replace(range, encryptedLines.join("\n"));
        });
      }
    }
  );

  context.subscriptions.push(encryptDisposable);
  context.subscriptions.push(decryptDisposable);
}

export function deactivate() {}
