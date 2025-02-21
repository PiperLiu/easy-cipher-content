import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // 注册命令
    let encryptDisposable = vscode.commands.registerCommand('easy-cipher-content.encrypt', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const text = document.getText();
            const encrypted = text.toUpperCase();
            
            editor.edit(editBuilder => {
                const range = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(text.length)
                );
                editBuilder.replace(range, encrypted);
            });
        }
    });

    let decryptDisposable = vscode.commands.registerCommand('easy-cipher-content.decrypt', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const text = document.getText();
            const decrypted = text.toLowerCase();
            
            editor.edit(editBuilder => {
                const range = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(text.length)
                );
                editBuilder.replace(range, decrypted);
            });
        }
    });

    // 添加订阅以确保资源在插件停用时释放
    context.subscriptions.push(encryptDisposable);
    context.subscriptions.push(decryptDisposable);
}

export function deactivate() {}