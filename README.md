# Easy Cipher Content

A powerful VS Code extension for securing both text and binary files with industry-standard encryption algorithms. Easily protect your sensitive data while maintaining a seamless workflow in your development environment.

![Encrypt / Decrypt One File](https://raw.githubusercontent.com/PiperLiu/easy-cipher-content/refs/heads/main/docs/example.file.gif)

## Features

- 🔒 **Encrypt** and 🔓 **Decrypt** content with a single click
- 🔄 Support for both text files (line-by-line encryption) and binary files (complete file encryption)
- 🗄️ Batch operations for entire workspaces or specific directories
- 📂 Smart path suggestions and file browser integration
- 🚫 Configurable ignore patterns for excluding files from batch operations
- 🔐 Enterprise-grade encryption algorithms: AES-GCM and ChaCha20-Poly1305
- 🛠️ Flexible key management via environment variables or JSON configuration
- 🔑 **Enhanced Security**: Automatic salt and IV/nonce generation for maximum security
- 🔀 **Git-Diff-Aware Encryption**: Only re-encrypt lines that have changed according to git diff, preserving git history

## Getting Started

### Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Easy Cipher Content"
4. Click Install

### Setup

Configure your encryption keys using one of these methods:

**Environment Variables** (Recommended for security)
```bash
# For AES-GCM
export VSCODE_EXT_ECC_AESGCM_PASSWORD="your-secure-password"

# For ChaCha20-Poly1305
export VSCODE_EXT_ECC_CHACHA20POLY1305_PASSWORD="your-secure-password"
```

**JSON Configuration**
Create a JSON file with your encryption keys and set the path in the extension settings:

```json
{
  "password": "your-secure-password",
  "textEncoding": "utf-8"
}
```

> **🔒 Security Enhancement**: Starting with easy-cipher-mate@2.0.0, salt and IV/nonce values are automatically generated for each encryption operation, ensuring maximum security without manual configuration.

## Usage

### Single File Operations

1. Open a file in the editor
2. Click the 🔒 **Encrypt** or 🔓 **Decrypt** button in the editor title bar
3. For text files, content is encrypted line-by-line, preserving the file structure
4. For binary files, a new encrypted file is created with the `.enc` extension

### Workspace Operations

Encrypt or decrypt multiple files in your workspace:

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type and select one of the following:
   - `Easy Cipher Content: 🔒 Encrypt All Files in Workspace`
   - `Easy Cipher Content: 🔓 Decrypt All Files in Workspace`
   - `Easy Cipher Content: 🔒 Encrypt Specific Files or Directories`
   - `Easy Cipher Content: 🔓 Decrypt Specific Files or Directories`

### Path Selection

When choosing specific files or directories to process, you have three convenient options:

1. **Quick Selection**: Choose from smart suggestions of common directories and files
2. **Custom Path**: Enter a custom path relative to your workspace or an absolute path
3. **File Browser**: Use the integrated file picker to visually select files or folders

![Path Selection Interface](https://raw.githubusercontent.com/PiperLiu/easy-cipher-content/refs/heads/main/docs/example.path.gif)

### Ignoring Files and Directories

Create a `.easy-cipher-content-ignore` file in your workspace root with patterns similar to `.gitignore`:

```
# Example ignore patterns
node_modules/
*.log
.git/
dist/
```

## Extension Settings

This extension provides the following settings:

* `easy-cipher-content.algorithm`: Choose encryption algorithm ("aes-gcm" or "chacha20-poly1305")
* `easy-cipher-content.use_env`: Whether to use environment variables for encryption keys
* `easy-cipher-content.json_path`: Path to JSON file containing encryption keys (if not using env vars)
* `easy-cipher-content.textFileExtensions`: Array of file extensions to be treated as text files
* `easy-cipher-content.ignoreFile`: Name of the file containing ignore patterns
* `easy-cipher-content.deleteOriginalAfterEncryption`: Whether to delete original files after encryption
* `easy-cipher-content.enableGitDiffAwareEncryption`: Enable git-diff-aware encryption for text files (default: true)

## Security Best Practices

- **Never commit** encryption keys or encrypted sensitive data to public repositories
- Use **environment variables** rather than JSON files for key management when possible
- Set up a secure method for sharing encryption keys with team members
- Consider using different keys for different projects or types of sensitive data
- **Automatic Security**: The extension automatically generates unique salt and IV/nonce values for each encryption operation, ensuring maximum security

## Technical Details

### Enhanced Security Features

- **Automatic Salt Generation**: Each encryption operation uses a randomly generated 16-byte salt
- **Automatic IV/Nonce Generation**: 
  - AES-GCM: 12-byte random IV per operation
  - ChaCha20-Poly1305: 12-byte random nonce per operation
- **PBKDF2 Key Derivation**: Uses 100,000 iterations for secure key derivation
- **Authenticated Encryption**: Built-in integrity protection prevents tampering

### Text File Encryption

Text files are processed line by line, with each non-empty line encrypted individually. This approach:
- Preserves file structure and line breaks
- Makes diff tools still useful for encrypted files
- Allows partial decryption if only certain lines need to be accessible
- Each line gets its own unique salt and IV/nonce for maximum security

### Git-Diff-Aware Encryption (New in v2.1.0)

When `enableGitDiffAwareEncryption` is enabled (default), the extension intelligently handles text file encryption by only re-encrypting lines that have changed according to git diff. This feature:

- **Preserves Git History**: Unchanged encrypted lines remain identical, making git diff meaningful even for encrypted files
- **Optimizes Performance**: Only modified lines are re-encrypted, speeding up the encryption process
- **Maintains Security**: Each re-encrypted line still gets unique salt and IV/nonce values

#### How It Works

1. **Git Repository Detection**: Automatically detects if the file is in a git repository
2. **Change Analysis**: Uses `git diff` to identify which lines have been modified
3. **Selective Encryption**: 
   - **Changed lines**: Re-encrypted with new salt/IV values
   - **Unchanged lines**: Preserved from the previous encrypted version
   - **New files**: All lines are encrypted (fallback behavior)
   - **Non-git projects**: All lines are encrypted (fallback behavior)

#### Example Workflow

```bash
# Initial state: encrypted file in git
git status  # clean

# User decrypts, modifies line 14-15, then re-encrypts
# Result: Only lines 14-15 are different in git diff
git diff main.go
# Shows only the actual changed encrypted lines, not the entire file
```

#### Edge Cases Handled

- **New files**: All lines are encrypted when file is not tracked by git
- **Non-git repositories**: Falls back to traditional full-file encryption
- **Missing original content**: Falls back to encrypting all lines
- **Git command failures**: Gracefully falls back to traditional encryption

### Binary File Encryption

Binary files are encrypted as complete units, resulting in a new file with the `.enc` extension.

## Migration from Previous Versions

If you're upgrading from a previous version that required manual salt/IV configuration:

1. **Remove old environment variables**: You no longer need to set salt, IV, or nonce values
2. **Update JSON configuration**: Remove salt, IV, and nonce fields from your JSON config files
3. **Re-encrypt existing files**: Files encrypted with the old version will need to be decrypted with the old configuration and re-encrypted with the new version for enhanced security

## Known Issues

- Very large binary files may cause performance issues during encryption/decryption
- Some special encodings might not be preserved perfectly in text mode encryption
- The extension cannot automatically detect binary vs text files outside the configured extensions

## Troubleshooting

**Issue**: Decryption fails with "Invalid password" error
**Solution**: Verify that you're using the same encryption key that was used for encryption

**Issue**: Binary files are being treated as text files
**Solution**: Add the file extension to the `textFileExtensions` setting if it should be treated as text, or remove it if it should be treated as binary

**Issue**: Files encrypted with older versions cannot be decrypted
**Solution**: Use the previous version of the extension to decrypt, then re-encrypt with the new version for enhanced security

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgments

- Built with [easy-cipher-mate](https://github.com/PiperLiu/easy-cipher-mate) encryption library v2.0.0+
- Inspired by the need for simple but secure content protection in VS Code

---

**Privacy Notice**: This extension performs all encryption and decryption locally on your machine. Your encryption keys and content are never transmitted to any server.