# Easy Cipher Content

A VS Code extension for encrypting and decrypting both text and binary files with AES-GCM or ChaCha20-Poly1305 algorithms.

## Features

- 🔒 **Encrypt** and 🔓 **Decrypt** text content line by line or entire files
- 🖼️ Support for both text files and binary files (images, videos, etc.)
- 🗄️ Batch encryption/decryption of an entire workspace
- 🚫 Ignore specific files/directories during batch operations
- 🔑 Configurable encryption algorithms and key management

## Usage

### Single File Operations

- Click the 🔒 **Encrypt** or 🔓 **Decrypt** buttons in the editor title bar
- For text files, content is encrypted line by line
- For binary files, the entire file is encrypted and saved with a `.enc` extension

### Workspace Operations

1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux) to open the Command Palette
2. Type "Encrypt All Files in Workspace" or "Decrypt All Files in Workspace"
3. The extension will process all files according to your configuration

### Ignoring Files

Create a `.easy-cipher-content-ignore` file in your workspace root with patterns similar to `.gitignore`:

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