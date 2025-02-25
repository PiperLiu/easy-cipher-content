# Easy Cipher Content

A VS Code extension for encrypting and decrypting text content using industry-standard encryption algorithms.

## Features

This extension provides two buttons in the editor title bar for any text file:
- 🔒 Encrypt: Encrypts text using your chosen algorithm (AES-GCM or ChaCha20-Poly1305)
- 🔓 Decrypt: Decrypts previously encrypted text

The buttons appear in the editor title bar (next to each tab) when a text file is open.

## Configuration

This extension supports the following settings:

* `easy-cipher-content.algorithm`: Choose encryption algorithm ("aes-gcm" or "chacha20-poly1305")
* `easy-cipher-content.use_env`: Whether to use environment variables for encryption keys
* `easy-cipher-content.json_path`: Path to JSON file containing encryption keys (if not using env vars)

### Environment Variables

When using environment variables (`use_env` = `true`):

For AES-GCM:
- VSCODE_EXT_ECC_AESGCM_PASSWORD
- VSCODE_EXT_ECC_AESGCM_SALT
- VSCODE_EXT_ECC_AESGCM_IV

For ChaCha20-Poly1305:
- VSCODE_EXT_ECC_CHACHA20POLY1305_PASSWORD
- VSCODE_EXT_ECC_CHACHA20POLY1305_SALT
- VSCODE_EXT_ECC_CHACHA20POLY1305_NONCE

### JSON Configuration

When using JSON config (`use_env` = `false`), create a JSON file with:
```json
// aes-gcm
{
  "password": "your_password",
  "salt": "your_salt",
  "iv": "your_iv"
}

// chacha20-poly1305
{
  "password": "your_password",
  "salt": "your_salt",
  "nonce": "your_nonce"
}
```

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of Easy Cipher Content

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**