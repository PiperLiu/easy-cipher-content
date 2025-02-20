import * as vscode from 'vscode';

let encryptButton: vscode.StatusBarItem;
let decryptButton: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    // 创建状态栏按钮
    encryptButton = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    encryptButton.text = "$(lock) Encrypt";
    encryptButton.command = 'easy-cipher-content.encrypt';
    
    decryptButton = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        99
    );
    decryptButton.text = "$(unlock) Decrypt";
    decryptButton.command = 'easy-cipher-content.decrypt';

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

    // 监听编辑器变化，显示/隐藏按钮
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(() => {
            updateButtonVisibility();
        })
    );

    // 初始化按钮状态
    updateButtonVisibility();

    // 注册到订阅列表
    context.subscriptions.push(encryptButton);
    context.subscriptions.push(decryptButton);
    context.subscriptions.push(encryptDisposable);
    context.subscriptions.push(decryptDisposable);
}

function updateButtonVisibility() {
    if (vscode.window.activeTextEditor) {
        encryptButton.show();
        decryptButton.show();
    } else {
        encryptButton.hide();
        decryptButton.hide();
    }
}

export function deactivate() {
    if (encryptButton) {
        encryptButton.dispose();
    }
    if (decryptButton) {
        decryptButton.dispose();
    }
}
