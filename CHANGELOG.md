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
