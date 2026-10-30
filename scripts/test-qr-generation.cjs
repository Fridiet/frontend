const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(relativePath, imports = {}, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, require: (name) => {
      if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
      return imports[name];
    }, Uint8Array, Blob, URL, ...globals,
  });
  return exports;
}

async function main() {
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2]);
  const calls = [];
  let response = bytes.buffer;
  let simulateTimeout = false;
  const request = async (url, config) => {
    calls.push({ url, config });
    if (simulateTimeout) {
      assert.equal(config.timeout, 20000, 'transport must have a finite deadline');
      // Simulate the transport deadline without sleeping for twenty seconds.
      return Promise.reject(new Error('timeout of 20000ms exceeded'));
    }
    return { data: response };
  };
  const api = load('api/containerApi.ts', {
    'react-native': { Platform: { OS: 'web' } },
    './client': { default: { get: request, post: (url, _payload, config) => request(url, config) } },
  });
  const signal = new AbortController().signal;
  assert.deepEqual(await api.generateContainerQr('same-token', signal), bytes);
  await api.generateContainerQr('same-token', signal);
  assert.equal(calls[0].url, '/api/containers/qr/generate');
  assert.equal(calls[0].config.params.token, calls[1].config.params.token);
  assert.equal(calls[0].config.signal, signal);
  response = new Uint8Array([60, 104, 116, 109, 108]).buffer;
  await assert.rejects(api.generateContainerQr('same-token'), /QR 이미지가 아닌/);
  simulateTimeout = true;
  await assert.rejects(api.scanContainer('same-token'), /timeout/);
  await assert.rejects(api.registerContainer({ qrCodeToken: 'same-token', fridgeId: 1, existingBatchId: 10 }), /timeout/);

  let blob;
  let clicked;
  let revoked = 0;
  const web = load('utils/qrImage.web.ts', {}, {
    URL: { createObjectURL: (value) => { blob = value; return 'blob:qr'; }, revokeObjectURL: () => { revoked++; } },
    document: {
      createElement: () => ({ click() { clicked = { href: this.href, download: this.download }; }, remove() {} }),
      body: { appendChild() {} },
    },
  });
  const image = web.createQrImage(bytes, 'same-token');
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), bytes);
  await image.exportImage();
  assert.equal(clicked.href, image.uri);
  assert.equal(clicked.download, 'fridiet-qr-same-token.png');
  image.dispose();
  image.dispose();
  assert.equal(revoked, 1);
  await assert.rejects(image.exportImage(), /다시 생성/);

  let deleted = 0;
  let written;
  let available = true;
  let releaseShare;
  let shareStarted;
  const started = new Promise((resolve) => { shareStarted = resolve; });
  const native = load('utils/qrImage.ts', {
    'expo-file-system': {
      Paths: { cache: 'cache:' },
      File: class {
        constructor(_root, name) { this.uri = `cache:/${name}`; this.exists = false; }
        write(data) { written = data; this.exists = true; }
        delete() { this.exists = false; deleted++; }
      },
    },
    'expo-sharing': {
      isAvailableAsync: async () => available,
      shareAsync: async (uri, options) => {
        assert.equal(uri, 'cache:/fridiet-qr-same-token.png');
        assert.equal(options.mimeType, 'image/png');
        shareStarted();
        await new Promise((resolve) => { releaseShare = resolve; });
      },
    },
  });
  const nativeImage = native.createQrImage(bytes, 'same-token');
  assert.deepEqual(written, bytes);
  const sharing = nativeImage.exportImage();
  await started;
  nativeImage.dispose();
  assert.equal(deleted, 0, 'keep file alive while native share sheet is open');
  releaseShare();
  await sharing;
  assert.equal(deleted, 1);
  nativeImage.dispose();
  assert.equal(deleted, 1);
  available = false;
  const unsupported = native.createQrImage(bytes, 'unsupported');
  await assert.rejects(unsupported.exportImage(), /공유를 지원하지/);
  unsupported.dispose();
  assert.equal(deleted, 2);
  console.log('QR tests passed: API token/retry, PNG validation, identical export bytes, web cleanup, native sharing lifetime and unsupported sharing.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
