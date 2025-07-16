import * as assert from 'assert';
import * as vscode from 'vscode';
import { encryptionServiceFactory } from '../encryption';

suite('Encryption Test Suite', () => {
	let mockConfig: vscode.WorkspaceConfiguration;

	setup(() => {
		mockConfig = {
			get: (key: string) => {
				switch (key) {
					case 'algorithm':
						return 'aes-gcm';
					case 'use_env':
						return true;
					case 'json_path':
						return '';
					default:
						return undefined;
				}
			}
		} as any;
	});

	test('AES-GCM encryption service should be created successfully', () => {
		const service = encryptionServiceFactory(mockConfig);
		assert.ok(service, 'Encryption service should be created');
	});

	test('ChaCha20-Poly1305 encryption service should be created successfully', () => {
		const chachaConfig = {
			get: (key: string) => {
				switch (key) {
					case 'algorithm':
						return 'chacha20-poly1305';
					case 'use_env':
						return true;
					case 'json_path':
						return '';
					default:
						return undefined;
				}
			}
		} as any;

		const service = encryptionServiceFactory(chachaConfig);
		assert.ok(service, 'ChaCha20-Poly1305 encryption service should be created');
	});

	test('Encryption service should encrypt and decrypt text correctly', async () => {
		const service = encryptionServiceFactory(mockConfig);
		const plaintext = 'Hello, World!';
		
		// Encrypt the text
		const encrypted = await service.encryptText(plaintext);
		assert.ok(encrypted.data, 'Encrypted data should exist');
		assert.ok(encrypted.data.byteLength > 0, 'Encrypted data should not be empty');
		
		// Decrypt the text
		const decrypted = await service.decryptText(encrypted.data);
		assert.strictEqual(decrypted, plaintext, 'Decrypted text should match original');
	});
});