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
        const encrypted = await encryptionService.encryptText(text);

        editor.edit((editBuilder) => {
          const range = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
          );
          editBuilder.replace(
            range,
            Buffer.from(encrypted.data).toString("utf-8")
          );
        });
      }
    }
  );

  let decryptDisposable = vscode.commands.registerCommand(
    "easy-cipher-content.decrypt",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
        const text = document.getText();
        const decrypted = text.toLowerCase();

        editor.edit((editBuilder) => {
          const range = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
          );
          editBuilder.replace(range, decrypted);
        });
      }
    }
  );

  context.subscriptions.push(encryptDisposable);
  context.subscriptions.push(decryptDisposable);
}

export function deactivate() {}
