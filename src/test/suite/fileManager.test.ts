import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { FileManager } from '../../fileManager';

suite('FileManager Test Suite', () => {
    let fileManager: FileManager;
    let mockEncryptionService: any;
    let mockConfig: any;
    // This will be our mock filesystem
    let mockFileSystem: any;

    setup(() => {
        // Mock encryption service
        mockEncryptionService = {
            encryptText: sinon.stub().resolves({ data: Buffer.from('encrypted').buffer }),
            decryptText: sinon.stub().resolves('decrypted'),
            encryptFile: sinon.stub().resolves({ data: Buffer.from('encrypted-file').buffer }),
            decryptFile: sinon.stub().resolves(Buffer.from('decrypted-file').buffer)
        };

        // Mock configuration
        mockConfig = {
            get: sinon.stub()
        };
        mockConfig.get.withArgs('textFileExtensions').returns(['.txt', '.md', '.js']);
        mockConfig.get.withArgs('deleteOriginalAfterEncryption').returns(true);

        // Mock file system object with all needed methods
        mockFileSystem = {
            readFile: sinon.stub(),
            writeFile: sinon.stub().resolves(),
            delete: sinon.stub().resolves(),
            stat: sinon.stub(),
            readDirectory: sinon.stub()
        };

        // Instead of using sinon.replace, pass the mock object to the constructor.
        fileManager = new FileManager(
            mockEncryptionService,
            mockConfig,
            mockFileSystem as vscode.FileSystem
        );
    });

    teardown(() => {
        sinon.restore();
    });

    test('encryptFile should encrypt file and add .enc extension', async () => {
        const testFileUri = vscode.Uri.file('/test/image.png');
        const fileContent = Buffer.from('test content');
        mockFileSystem.readFile.resolves(fileContent);

        await fileManager.encryptFile(testFileUri);

        // Check if encryption was called with correct content
        assert.ok(mockEncryptionService.encryptFile.calledWith(fileContent.buffer));

        // Check if file was written with encrypted content
        assert.ok(mockFileSystem.writeFile.calledWith(
            vscode.Uri.file('/test/image.png.enc'),
            sinon.match.any
        ));

        // Check if original file was deleted
        assert.ok(mockFileSystem.delete.calledWith(testFileUri));
    });

    test('decryptFile should decrypt file and remove .enc extension', async () => {
        const testFileUri = vscode.Uri.file('/test/image.png.enc');
        const fileContent = Buffer.from('encrypted content');
        mockFileSystem.readFile.resolves(fileContent);

        await fileManager.decryptFile(testFileUri);

        // Check if decryption was called with correct content
        assert.ok(mockEncryptionService.decryptFile.calledWith(fileContent.buffer));

        // Check if file was written with decrypted content
        assert.ok(mockFileSystem.writeFile.calledWith(
            vscode.Uri.file('/test/image.png'),
            sinon.match.any
        ));

        // Check if encrypted file was deleted
        assert.ok(mockFileSystem.delete.calledWith(testFileUri));
    });

    test('processTextFile should process content line by line for encryption', async () => {
        const testFileUri = vscode.Uri.file('/test/file.txt');
        const fileContent = Buffer.from('line1\nline2\nline3');
        mockFileSystem.readFile.resolves(fileContent);

        await fileManager.processTextFile(testFileUri, 'encrypt');

        // Check if encryption was called for each non-empty line
        assert.strictEqual(mockEncryptionService.encryptText.callCount, 3);

        // Check if file was written with processed content
        assert.ok(mockFileSystem.writeFile.calledWith(testFileUri, sinon.match.any));
    });
});