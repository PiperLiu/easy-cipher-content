import * as assert from 'assert';
import * as sinon from 'sinon';
import { GitDiffService, EncryptionContext } from '../../services/gitDiffService';
import * as vscode from 'vscode';

suite('GitDiffService Test Suite', () => {
  let service: GitDiffService;
  let stubs: sinon.SinonStub[] = [];

  // Helper to Base64-encode strings for mock encrypted data.
  const toBase64 = (s: string) => Buffer.from(s).toString('base64');

  // A simple mock encryption service for predictable test behavior.
  const mockEncryptionService = {
    decryptText: async (buffer: Buffer, encoding: string): Promise<string> => {
      const text = buffer.toString(encoding as BufferEncoding);
      if (text.startsWith('enc(') && text.endsWith(')')) {
        return text.slice(4, -1);
      }
      // Simulate failure for non-mocked encrypted lines
      throw new Error('Decryption failed for test');
    },
  };

  // Helper to set up stubs for a test case
  const setupStubs = (isGitRepo: boolean, isNewFile: boolean, originalEncryptedContent: string[]) => {
    // Stub private methods by casting to any
    const serviceAsAny = service as any;

    const initStub = sinon.stub(serviceAsAny, 'initializeGitRepository').callsFake(async () => {
      serviceAsAny.isGitRepository = isGitRepo;
    });

    const getContextStub = sinon.stub(serviceAsAny, 'getGitContext').resolves({ isNewFile });

    const getContentStub = sinon.stub(serviceAsAny, 'getOriginalEncryptedContent').resolves(originalEncryptedContent);

    stubs.push(initStub, getContextStub, getContentStub);
  };

  setup(() => {
    // Provide a fake workspace folder for the constructor
    const fakeWorkspaceFolder = {
      uri: vscode.Uri.file('/fake/workspace'),
      name: 'fakeWorkspace',
      index: 0
    };
    service = new GitDiffService(fakeWorkspaceFolder);
  });

  teardown(() => {
    sinon.restore();
    stubs = [];
  });

  test('should re-encrypt all lines when not in a git repository', async () => {
    setupStubs(false, true, []);
    const context = await service.createEncryptionContext('file.txt', 'a\nb', mockEncryptionService);

    assert.strictEqual(context.isGitRepo, false, 'Context should indicate not a git repo');
    assert.strictEqual(context.unchangedLinesMap.size, 0, 'Unchanged map should be empty');
    assert.ok(service.shouldReEncryptLine(1, context), 'Line 1 should be re-encrypted');
    assert.ok(service.shouldReEncryptLine(2, context), 'Line 2 should be re-encrypted');
  });

  test('should re-encrypt all lines for a new file', async () => {
    setupStubs(true, true, []);
    const context = await service.createEncryptionContext('file.txt', 'a\nb', mockEncryptionService);

    assert.strictEqual(context.isNewFile, true, 'Context should indicate a new file');
    assert.strictEqual(context.unchangedLinesMap.size, 0, 'Unchanged map should be empty');
    assert.ok(service.shouldReEncryptLine(1, context), 'Line 1 should be re-encrypted');
    assert.ok(service.shouldReEncryptLine(2, context), 'Line 2 should be re-encrypted');
  });

  test('should not re-encrypt unchanged files', async () => {
    const originalEncrypted = [toBase64('enc(a)'), toBase64('enc(b)'), toBase64('enc(c)')];
    const currentContent = 'a\nb\nc';
    setupStubs(true, false, originalEncrypted);

    const context = await service.createEncryptionContext('file.txt', currentContent, mockEncryptionService);

    assert.strictEqual(context.unchangedLinesMap.size, 3, 'All 3 lines should be in the unchanged map');
    assert.strictEqual(service.getOriginalEncryptedLine(1, context), originalEncrypted[0]);
    assert.strictEqual(service.getOriginalEncryptedLine(2, context), originalEncrypted[1]);
    assert.strictEqual(service.getOriginalEncryptedLine(3, context), originalEncrypted[2]);
  });

  test('should only re-encrypt a modified line', async () => {
    const originalEncrypted = [toBase64('enc(a)'), toBase64('enc(b)'), toBase64('enc(c)')];
    const currentContent = 'a\nB\nc'; // Line 2 is modified
    setupStubs(true, false, originalEncrypted);

    const context = await service.createEncryptionContext('file.txt', currentContent, mockEncryptionService);

    assert.strictEqual(context.unchangedLinesMap.size, 2, 'Two lines should be unchanged');
    assert.strictEqual(service.shouldReEncryptLine(1, context), false, 'Line 1 should not be re-encrypted');
    assert.strictEqual(service.shouldReEncryptLine(2, context), true, 'Line 2 should be re-encrypted');
    assert.strictEqual(service.shouldReEncryptLine(3, context), false, 'Line 3 should not be re-encrypted');
    assert.strictEqual(service.getOriginalEncryptedLine(1, context), originalEncrypted[0]);
    assert.strictEqual(service.getOriginalEncryptedLine(2, context), null);
    assert.strictEqual(service.getOriginalEncryptedLine(3, context), originalEncrypted[2]);
  });

  test('should handle line insertion', async () => {
    const originalEncrypted = [toBase64('enc(a)'), toBase64('enc(c)')];
    const currentContent = 'a\nb\nc'; // Line 'b' is inserted
    setupStubs(true, false, originalEncrypted);

    const context = await service.createEncryptionContext('file.txt', currentContent, mockEncryptionService);

    assert.strictEqual(context.unchangedLinesMap.size, 2, 'Two lines should be unchanged');
    assert.strictEqual(service.shouldReEncryptLine(1, context), false, 'Line 1 (a) should not be re-encrypted');
    assert.strictEqual(service.shouldReEncryptLine(2, context), true, 'Line 2 (b) should be re-encrypted');
    assert.strictEqual(service.shouldReEncryptLine(3, context), false, 'Line 3 (c) should not be re-encrypted');
    assert.strictEqual(service.getOriginalEncryptedLine(1, context), originalEncrypted[0]);
    assert.strictEqual(service.getOriginalEncryptedLine(3, context), originalEncrypted[1]);
  });

  test('should handle line deletion', async () => {
    const originalEncrypted = [toBase64('enc(a)'), toBase64('enc(b)'), toBase64('enc(c)')];
    const currentContent = 'a\nc'; // Line 'b' is deleted
    setupStubs(true, false, originalEncrypted);

    const context = await service.createEncryptionContext('file.txt', currentContent, mockEncryptionService);

    assert.strictEqual(context.unchangedLinesMap.size, 2, 'Two lines should be unchanged');
    assert.strictEqual(service.shouldReEncryptLine(1, context), false, 'Line 1 (a) should not be re-encrypted');
    assert.strictEqual(service.shouldReEncryptLine(2, context), false, 'Line 2 (c) should not be re-encrypted');
    assert.strictEqual(service.getOriginalEncryptedLine(1, context), originalEncrypted[0]);
    assert.strictEqual(service.getOriginalEncryptedLine(2, context), originalEncrypted[2]);
  });

  test('should handle moved lines correctly (LCS)', async () => {
    const originalEncrypted = [toBase64('enc(common1)'), toBase64('enc(common2)'), toBase64('enc(common3)')];
    const currentContent = 'common3\ncommon1\ncommon2'; // Lines are reordered
    setupStubs(true, false, originalEncrypted);

    const context = await service.createEncryptionContext('file.txt', currentContent, mockEncryptionService);

    assert.strictEqual(context.unchangedLinesMap.size, 3, 'All 3 common lines should be identified');
    assert.strictEqual(service.shouldReEncryptLine(1, context), false, 'Line 1 (common3) should not be re-encrypted');
    assert.strictEqual(service.shouldReEncryptLine(2, context), false, 'Line 2 (common1) should not be re-encrypted');
    assert.strictEqual(service.shouldReEncryptLine(3, context), false, 'Line 3 (common2) should not be re-encrypted');
    assert.strictEqual(service.getOriginalEncryptedLine(1, context), originalEncrypted[2]);
    assert.strictEqual(service.getOriginalEncryptedLine(2, context), originalEncrypted[0]);
    assert.strictEqual(service.getOriginalEncryptedLine(3, context), originalEncrypted[1]);
  });

  test('should handle a complex diff with additions, deletions, and modifications', async () => {
    const originalEncrypted = [
      toBase64('enc(common header)'),
      toBase64('enc(line to be deleted)'),
      toBase64('enc(same line)'),
      toBase64('enc(line to be modified)'),
      toBase64('enc(common footer)')
    ];
    const currentContent = [
      'line to be added',
      'common header',
      'same line',
      'this line was modified',
      'common footer',
      'another added line'
    ].join('\n');
    setupStubs(true, false, originalEncrypted);

    const context = await service.createEncryptionContext('file.txt', currentContent, mockEncryptionService);

    assert.strictEqual(context.unchangedLinesMap.size, 3, 'Three common lines should be identified');

    // Lines that should be re-encrypted (new, modified)
    assert.ok(service.shouldReEncryptLine(1, context), 'Added line 1 should be re-encrypted');
    assert.ok(service.shouldReEncryptLine(4, context), 'Modified line 4 should be re-encrypted');
    assert.ok(service.shouldReEncryptLine(6, context), 'Added line 6 should be re-encrypted');

    // Lines that should NOT be re-encrypted (common)
    assert.strictEqual(service.getOriginalEncryptedLine(2, context), originalEncrypted[0]);
    assert.strictEqual(service.getOriginalEncryptedLine(3, context), originalEncrypted[2]);
    assert.strictEqual(service.getOriginalEncryptedLine(5, context), originalEncrypted[4]);
  });
});
