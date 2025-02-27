import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { isTextFile, getTargetFilePath, shouldIgnore } from '../../utils';

suite('Utils Test Suite', () => {
	let mockConfig: any;

	setup(() => {
		mockConfig = {
			get: sinon.stub()
		};
		mockConfig.get.withArgs('textFileExtensions').returns(['.txt', '.md', '.js']);
	});

	teardown(() => {
		sinon.restore();
	});

	test('isTextFile should detect text files correctly', () => {
		assert.strictEqual(isTextFile('/path/to/file.txt', mockConfig), true);
		assert.strictEqual(isTextFile('/path/to/file.md', mockConfig), true);
		assert.strictEqual(isTextFile('/path/to/file.js', mockConfig), true);
		assert.strictEqual(isTextFile('/path/to/file.png', mockConfig), false);
		assert.strictEqual(isTextFile('/path/to/file.jpg', mockConfig), false);
	});

	test('getTargetFilePath should add .enc for encryption', () => {
		assert.strictEqual(
			getTargetFilePath('/path/to/file.png', 'encrypt'),
			'/path/to/file.png.enc'
		);
		assert.strictEqual(
			getTargetFilePath('/path/to/file.png.enc', 'encrypt'),
			'/path/to/file.png.enc'
		);
	});

	test('getTargetFilePath should remove .enc for decryption', () => {
		assert.strictEqual(
			getTargetFilePath('/path/to/file.png.enc', 'decrypt'),
			'/path/to/file.png'
		);
		assert.strictEqual(
			getTargetFilePath('/path/to/file.png', 'decrypt'),
			'/path/to/file.png'
		);
	});

	test('shouldIgnore should match patterns correctly', () => {
		const patterns = [
			'node_modules/**',
			'.git/**',
			'*.log',
			'**/*.enc'
		];

		assert.strictEqual(shouldIgnore('node_modules/package.json', patterns), true);
		assert.strictEqual(shouldIgnore('.git/config', patterns), true);
		assert.strictEqual(shouldIgnore('logs/app.log', patterns), true);
		assert.strictEqual(shouldIgnore('images/photo.png.enc', patterns), true);
		assert.strictEqual(shouldIgnore('src/code.js', patterns), false);
	});
});
