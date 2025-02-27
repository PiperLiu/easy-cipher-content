import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { FileManager } from '../../fileManager';
import { EncryptionService } from 'easy-cipher-mate';

suite('FileManager Test Suite', () => {
	let fileManager: FileManager;
	let mockEncryptionService: any;
	let mockConfig: any;
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

		// Mock file system
		mockFileSystem = {
			readFile: sinon.stub(),
			writeFile: sinon.stub().resolves(),
			delete: sinon.stub().resolves()
		};

		// Replace VS Code's filesystem API with our mock
		sinon.replace(vscode.workspace.fs, 'readFile', mockFileSystem.readFile);
		sinon.replace(vscode.workspace.fs, 'writeFile', mockFileSystem.writeFile);
		sinon.replace(vscode.workspace.fs, 'delete', mockFileSystem.delete);

		// Create file manager instance with mocks
		fileManager = new FileManager(
			mockEncryptionService as unknown as EncryptionService<any, any>,
			mockConfig as unknown as vscode.WorkspaceConfiguration
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
		sinon.assert.calledWith(mockEncryptionService.encryptFile, fileContent.buffer);

		// Check if file was written with encrypted content
		sinon.assert.calledWith(
			mockFileSystem.writeFile,
			vscode.Uri.file('/test/image.png.enc'),
			sinon.match.any
		);

		// Check if original file was deleted
		sinon.assert.calledWith(mockFileSystem.delete, testFileUri);
	});

	test('decryptFile should decrypt file and remove .enc extension', async () => {
		const testFileUri = vscode.Uri.file('/test/image.png.enc');
		const fileContent = Buffer.from('encrypted content');

		mockFileSystem.readFile.resolves(fileContent);

		await fileManager.decryptFile(testFileUri);

		// Check if decryption was called with correct content
		sinon.assert.calledWith(mockEncryptionService.decryptFile, fileContent.buffer);

		// Check if file was written with decrypted content
		sinon.assert.calledWith(
			mockFileSystem.writeFile,
			vscode.Uri.file('/test/image.png'),
			sinon.match.any
		);

		// Check if encrypted file was deleted
		sinon.assert.calledWith(mockFileSystem.delete, testFileUri);
	});

	test('processTextFile should process content line by line', async () => {
		const testFileUri = vscode.Uri.file('/test/file.txt');
		const fileContent = Buffer.from('line1\nline2\nline3');

		mockFileSystem.readFile.resolves(fileContent);

		await fileManager.processTextFile(testFileUri, 'encrypt');

		// Check if encryption was called for each line
		assert.strictEqual(mockEncryptionService.encryptText.callCount, 3);

		// Check if file was written with processed content
		sinon.assert.calledWith(
			mockFileSystem.writeFile,
			testFileUri,
			sinon.match.any
		);
	});
});
