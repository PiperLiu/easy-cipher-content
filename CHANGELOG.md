## 2.1.0
- **Feature**: Implemented Git-Diff-Aware Encryption for text files. When enabled, only modified lines are re-encrypted, preserving git diff history for encrypted files.
- **Configuration**: Added easy-cipher-content.enableGitDiffAwareEncryption setting (enabled by default).
- **Improved** Performance: Selective line encryption enhances performance for large text files in Git repositories.
- **Robustness**: Automatically falls back to traditional encryption for new files or non-Git projects.

## 2.0.0
- **BREAKING CHANGE**: Updated to easy-cipher-mate@2.0.0 with enhanced security
- **Enhanced Security**: Automatic salt and IV/nonce generation for each encryption operation
- **Simplified Configuration**: No longer requires manual salt, IV, or nonce configuration
- **Improved API**: Uses new encryption config classes with automatic security parameter generation
- **Migration Required**: Files encrypted with previous versions need to be re-encrypted for enhanced security
- Added comprehensive encryption tests to ensure API compatibility

## 1.0.2
- Fix bug for decrypting single file
- Fix .vscodeignore docs for reducing package size

## 1.0.1
- Fix error loading json file

## 1.0.0
- Initial release
