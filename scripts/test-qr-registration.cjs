// Lightweight hook harness: exercises async state with mocked APIs, without a DB.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function harness(api) {
  const slots = [];
  let index = 0;
  let effects = [];
  let dirty = false;
  let props = ['token-1', { fridgeId: 1, fridgeName: '우리집' }, { current: false }];
  let output;
  const changed = (previous, next) => !previous || next.some((value, i) => !Object.is(value, previous[i]));
  const react = {
    useState(initial) {
      const i = index++;
      if (!slots[i]) slots[i] = { value: initial };
      return [slots[i].value, (value) => {
        const next = typeof value === 'function' ? value(slots[i].value) : value;
        if (!Object.is(slots[i].value, next)) { slots[i].value = next; dirty = true; }
      }];
    },
    useRef(initial) {
      const i = index++;
      if (!slots[i]) slots[i] = { value: { current: initial } };
      return slots[i].value;
    },
    useMemo(create, deps) {
      const i = index++;
      if (changed(slots[i]?.deps, deps)) slots[i] = { deps, value: create() };
      return slots[i].value;
    },
    useEffect(effect, deps) {
      const i = index++;
      if (changed(slots[i]?.deps, deps)) {
        const cleanup = slots[i]?.cleanup;
        slots[i] = { deps };
        effects.push(() => { cleanup?.(); slots[i].cleanup = effect(); });
      }
    },
  };
  const availability = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../utils/inventoryAvailability.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: availability });
  const imports = {
    '../utils/inventoryAvailability': availability,
    react,
    '../api/containerApi': api,
    '../api/inventoryApi': api,
    '../utils/apiError': { getApiErrorMessage: (error, fallback) => error.message || fallback },
  };
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../hooks/useQrRegistration.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, { exports, require: (name) => {
    assert.ok(name in imports, `Unexpected import ${name}`);
    return imports[name];
  } });
  function render() {
    let count = 0;
    do {
      assert.ok(++count < 20, 'render loop');
      dirty = false; index = 0; effects = [];
      output = exports.useQrRegistration(...props);
      effects.forEach((run) => run());
    } while (dirty);
  }
  render();
  return {
    get value() { render(); return output; },
    get lock() { return props[2]; },
    update(token, fridge) { props = [token, fridge, props[2]]; render(); },
    async flush() { for (let i = 0; i < 8; i++) { await Promise.resolve(); render(); } },
    unmount() { slots.forEach((slot) => slot.cleanup?.()); },
  };
}

const inventory = (batchId, fridgeId = 1) => ({ batchId, fridgeId, ingredientName: `재료 ${batchId}`, status: 'ACTIVE' });
const empty = (token) => ({ qrCodeToken: token, containerId: null, isEmpty: true });
const registered = (token, batchId = 10) => ({ qrCodeToken: token, containerId: 7, containerName: '서버 용기', batchId, ingredientName: '두부', isEmpty: false });

async function main() {
  let posts = [];
  let scans = [];
  let registerResponse = deferred();
  let scanResult = empty('token-1');
  const api = {
    getInventories: async (id) => [inventory(10, id), { ...inventory(11, id), status: 'CONSUMED' }, inventory(12, 99)],
    scanContainer: async (token) => { scans.push(token); return scanResult; },
    registerContainer: async (payload) => { posts.push(payload); return registerResponse.promise; },
  };
  const h = harness(api);
  assert.equal(h.value.inventoryLoading, true);
  await h.flush();
  assert.equal(h.value.inventories.length, 1);
  assert.equal(posts.length, 0, 'entering screen must not register anything');
  h.value.setSelectedBatchId(10);
  h.value.setContainerName('  반찬통 1  ');
  const connect = h.value.connect;
  const pending = connect();
  void connect();
  await h.flush();
  assert.equal(h.value.registering, true);
  assert.equal(h.lock.current, true);
  assert.equal(posts.length, 1, 'rapid duplicate presses must not double-register');
  assert.equal(posts[0].qrCodeToken, 'token-1');
  assert.equal(posts[0].fridgeId, 1);
  assert.equal(posts[0].existingBatchId, 10);
  assert.equal(posts[0].containerName, '반찬통 1');
  registerResponse.resolve(registered('token-1'));
  await pending;
  assert.equal(h.value.container.containerName, '서버 용기');
  assert.equal(h.lock.current, false);
  await h.value.connect();
  assert.equal(posts.length, 1, 'success summary must not re-register');

  h.update('token-2', { fridgeId: 1, fridgeName: '우리집' });
  assert.equal(h.value.container, null);
  assert.equal(h.value.containerName, '');
  assert.equal(h.value.selectedBatchId, null);
  h.value.setSelectedBatchId(10);
  scanResult = empty('token-2');
  registerResponse = deferred();
  const failed = h.value.connect();
  await h.flush();
  assert.equal(posts[1].containerName, '스마트 용기');
  registerResponse.reject(new Error('등록 실패'));
  await failed;
  assert.equal(h.value.error, '등록 실패');
  assert.equal(h.value.selectedBatchId, 10);
  assert.equal(h.value.container, null);

  registerResponse = deferred();
  const recovered = h.value.connect();
  await h.flush();
  scanResult = registered('token-2');
  registerResponse.reject(new Error('response lost'));
  await recovered;
  assert.equal(h.value.container.qrCodeToken, 'token-2');
  assert.equal(h.value.error, null);
  assert.equal(posts[1].qrCodeToken, posts[2].qrCodeToken, 'retry preserves token');

  h.update('token-3', { fridgeId: 1, fridgeName: '우리집' });
  h.value.setSelectedBatchId(10);
  scanResult = registered('token-3');
  await h.value.connect();
  assert.equal(posts.length, 3, 'preflight finds existing registration without overwriting');
  h.unmount();

  const firstList = deferred();
  const secondList = deferred();
  const moving = harness({ ...api, getInventories: (id) => id === 1 ? firstList.promise : secondList.promise });
  moving.update('token-1', { fridgeId: 2, fridgeName: '다른 냉장고' });
  secondList.resolve([inventory(20, 2)]);
  await moving.flush();
  moving.value.setSelectedBatchId(20);
  firstList.resolve([inventory(10, 1)]);
  await moving.flush();
  assert.equal(moving.value.inventories[0].batchId, 20, 'late inventory response is ignored');
  assert.equal(moving.value.selectedBatchId, 20);
  moving.update('token-1', null);
  assert.equal(moving.value.selectedBatchId, null);
  await moving.value.connect();
  assert.equal(posts.length, 3, 'no fridge means no registration');
  moving.unmount();

  let listFails = true;
  const listError = harness({ ...api, getInventories: async () => {
    if (listFails) throw new Error('목록 실패');
    return [];
  } });
  await listError.flush();
  assert.equal(listError.value.inventoryError, '목록 실패');
  listFails = false;
  listError.value.retryInventories();
  await listError.flush();
  assert.equal(listError.value.inventoryError, null);
  assert.equal(listError.value.inventories.length, 0);
  listError.unmount();

  const lateResult = deferred();
  const late = harness({ ...api, scanContainer: async (token) => empty(token), registerContainer: () => lateResult.promise });
  await late.flush();
  late.value.setSelectedBatchId(10);
  const latePending = late.value.connect();
  await late.flush();
  late.update('token-1', { fridgeId: 2, fridgeName: '다른 냉장고' });
  lateResult.resolve(registered('token-1'));
  await latePending;
  assert.equal(late.value.container, null, 'late registration response is ignored after fridge switch');
  assert.equal(late.value.registering, false);
  assert.equal(late.lock.current, false);
  late.unmount();

  const timedOut = harness({ ...api, scanContainer: async () => { throw new Error('timeout of 20000ms exceeded'); } });
  await timedOut.flush();
  timedOut.value.setSelectedBatchId(10);
  await timedOut.value.connect();
  assert.match(timedOut.value.error, /timeout/);
  assert.equal(timedOut.lock.current, false, 'preflight timeout must release export/new QR lock');
  assert.equal(timedOut.value.registering, false);
  assert.equal(timedOut.value.selectedBatchId, 10);
  timedOut.unmount();

  let scanCount = 0;
  const recoveryTimeout = harness({ ...api,
    scanContainer: async (token) => { if (++scanCount === 1) return empty(token); throw new Error('recovery timeout'); },
    registerContainer: async () => { throw new Error('registration timeout'); },
  });
  await recoveryTimeout.flush();
  recoveryTimeout.value.setSelectedBatchId(10);
  await recoveryTimeout.value.connect();
  assert.equal(scanCount, 2, 'registration timeout must attempt recovery scan');
  assert.equal(recoveryTimeout.value.error, 'registration timeout');
  assert.equal(recoveryTimeout.lock.current, false, 'recovery timeout must release lock');
  assert.equal(recoveryTimeout.value.selectedBatchId, 10);
  recoveryTimeout.unmount();
  assert.ok(scans.includes('token-1') && scans.includes('token-2'));
  console.log('QR registration tests passed: optional registration, payload, duplicate lock, reset, failure/recovery, preflight, inventory retry/empty, stale responses.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
