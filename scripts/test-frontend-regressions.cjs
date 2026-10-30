const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function load(file, imports = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, atob, console, URL, URLSearchParams, ...globals, require(name) {
    assert.ok(name in imports, `Unexpected import in ${file}: ${name}`);
    return imports[name];
  } });
  return exports;
}

function storage() {
  const data = new Map();
  return { data, getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async key => { data.delete(key); },
    multiRemove: async keys => { keys.forEach(key => data.delete(key)); } };
}

function harness(file, imports, props) {
  const slots = [];
  let index = 0, dirty = false, effects = [], output;
  const same = (a, b) => a && b && a.length === b.length && b.every((v, i) => Object.is(v, a[i]));
  const react = {
    createContext: () => ({ Provider: 'Provider' }), useContext: () => output.props.value,
    useState(initial) {
      const i = index++;
      if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; dirty = true; }];
    },
    useRef(initial) { const i = index++; if (!slots[i]) slots[i] = { value: { current: initial } }; return slots[i].value; },
    useCallback(fn, deps) { const i = index++; if (!same(slots[i]?.deps, deps)) slots[i] = { value: fn, deps }; return slots[i].value; },
    useMemo(fn, deps) { const i = index++; if (!same(slots[i]?.deps, deps)) slots[i] = { value: fn(), deps }; return slots[i].value; },
    useEffect(fn, deps) {
      const i = index++;
      if (!same(slots[i]?.deps, deps)) {
        slots[i]?.cleanup?.(); slots[i] = { deps };
        effects.push(() => { slots[i].cleanup = fn(); });
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const module = load(file, { ...imports, react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' } });
  const component = module.default ?? module.FridgeProvider ?? module.NotificationProvider ?? module.CookingCompleteModal;
  function render(next = props) {
    props = next;
    let count = 0;
    do {
      assert.ok(++count < 40, `Render loop: ${file}`);
      dirty = false; index = 0; effects = [];
      output = component(props);
      const pending = effects; pending.forEach(fn => fn());
    } while (dirty);
  }
  render();
  return {
    render,
    get value() { render(); return output.props.value; },
    nodes() {
      render(); const nodes = [];
      function visit(node) {
        if (Array.isArray(node)) return node.forEach(visit);
        if (!node || typeof node !== 'object') { if (node != null) nodes.push(node); return; }
        nodes.push(node); visit(node.props?.children);
      }
      visit(output); return nodes;
    },
    async flush() { for (let i = 0; i < 60; i++) { await Promise.resolve(); render(); } },
  };
}

async function main() {
  const social = load('utils/socialAuth.ts');
  const base = 'https://fridiet-backend.54-253-161-246.sslip.io';
  for (const provider of ['KAKAO', 'GOOGLE']) for (const purpose of ['login', 'link']) {
    const id = provider === 'GOOGLE' ? '123-client.apps.googleusercontent.com' : 'kakao-client';
    const url = new URL(social.socialAuthorizationUrl(provider, id, `${base}/`, purpose));
    assert.equal(url.searchParams.get('redirect_uri'), `${base}/${purpose}/oauth2/code/${provider.toLowerCase()}`);
    assert.equal(url.searchParams.get('client_id'), id);
  }
  assert.throws(() => social.socialAuthorizationUrl('GOOGLE', '123-client.apps.googleusercontent.comEXPO_PUBLIC_REDIRECT_URI=http://localhost', base));
  console.log('PASS: all four OAuth callbacks and malformed Client ID rejection');

  let requestInterceptor;
  load('api/client.js', {
    axios: { create: () => ({ interceptors: {
      request: { use: fn => { requestInterceptor = fn; } }, response: { use() {} },
    } }) },
    '../utils/token': { getToken: async () => 'stored-token' },
  }, { process: { env: {} }, __DEV__: false });
  assert.equal((await requestInterceptor({ headers: { Authorization: 'Bearer explicit-token' } })).headers.Authorization, 'Bearer explicit-token');
  assert.equal((await requestInterceptor({ headers: {} })).headers.Authorization, 'Bearer stored-token');
  const profileRequests = [];
  const users = load('api/userApi.js', { './client': { default: {
    get: async (...args) => { profileRequests.push(args); return { data: { name: '이름' } }; },
    patch: async (...args) => { profileRequests.push(args); return { data: '프로필 정보가 성공적으로 변경되었습니다.' }; },
  } } }, { process: { env: { EXPO_PUBLIC_PROFILE_ENDPOINT: '/confirmed-profile-path' } } });
  await users.getMyProfile('login-token');
  assert.equal(profileRequests[0][0], '/confirmed-profile-path');
  assert.equal(profileRequests[0][1].headers.Authorization, 'Bearer login-token');
  await users.updateProfile({ healthGoal: '건강 목표' }, 'editing-token');
  assert.equal(profileRequests[1][0], '/api/users/me/profile');
  assert.equal(profileRequests[1][1].healthGoal, '건강 목표');
  assert.equal(profileRequests[1][2].headers.Authorization, 'Bearer editing-token');
  console.log('PASS: profile endpoint configuration and explicit account authorization');

  const quantities = load('utils/inventoryQuantity.ts');
  for (const [quantity, unit] of [[500, 'g'], [125.5, 'mL'], [0.5, '개']]) {
    const draft = quantities.quantityDraftFromInventory({ unitType: 'QUANTITY', remainingQuantity: quantity, unit, customQuantityText: null });
    const result = quantities.toQuantityPayload(draft);
    assert.equal(result.unitType, 'QUANTITY'); assert.equal(result.remainingQuantity, quantity); assert.equal(result.unit, unit);
    assert.equal(result.customQuantityText, null);
  }
  assert.equal(quantities.quantityDraftFromInventory({ unitType: 'PERCENT', remainingQuantity: 0.5, unit: '%', customQuantityText: null }).percent, 0.5);
  console.log('PASS: numeric quantities and small percentages survive editing');

  let profileSession = { userId: '1' }, profileToken = 'auth-a', resolveProfile, profileCalls = 0;
  const patches = [];
  const profile = load('utils/sessionProfile.ts', {
    '../api/userApi': { getMyProfile: () => { profileCalls++; return new Promise(resolve => { resolveProfile = resolve; }); } },
    './token': { getSessionSnapshot: () => profileSession, getToken: async () => profileToken, updateSessionProfile: async patch => patches.push(patch) },
  });
  const first = profile.refreshCurrentUserProfile(), second = profile.refreshCurrentUserProfile();
  for (let i = 0; i < 12; i++) await Promise.resolve();
  assert.equal(profileCalls, 1);
  resolveProfile({ name: ' 김세림 ', email: 'serim@example.com' });
  await Promise.all([first, second]); assert.equal(patches[0].name, '김세림');
  profileToken = 'auth-a-new';
  const late = profile.refreshCurrentUserProfile();
  for (let i = 0; i < 12; i++) await Promise.resolve();
  profileSession = { userId: '2' }; profileToken = 'auth-b';
  resolveProfile({ name: '이전 계정' }); await late;
  assert.equal(patches.length, 1);
  assert.equal(profile.profileFromResponse({ data: { name: '구글 사용자' } }).name, '구글 사용자');
  assert.throws(() => profile.profileFromResponse({ email: 'no-name@example.com' }));
  assert.throws(() => profile.profileFromResponse({ name: '   ' }));
  console.log('PASS: profile hydration deduplication and account-change isolation');

  let editorSession = { userId: '1', name: '기존 이름' }, editorToken = 'editor-token';
  let savedProfile = { name: '기존 이름', healthCondition: '', healthGoal: '' };
  let readCalls = 0;
  let patchGate, readOverride;
  const editor = load('utils/sessionProfile.ts', {
    '../api/userApi': {
      updateProfile: async (payload, token) => {
        assert.equal(token, 'editor-token');
        assert.equal('name' in payload, false);
        if (patchGate) await patchGate;
        savedProfile = { ...savedProfile, ...payload };
        return '프로필 정보가 성공적으로 변경되었습니다.';
      },
      getMyProfile: async token => {
        readCalls++; assert.equal(token, 'editor-token');
        if (readOverride) return readOverride();
        return { data: { ...savedProfile } };
      },
    },
    './token': {
      getSessionSnapshot: () => editorSession, getToken: async () => editorToken,
      updateSessionProfile: async patch => { editorSession = { ...editorSession, ...patch }; },
    },
  });
  const editValues = { healthCondition: ' 건강 ', healthGoal: ' 목표 ' };
  await editor.saveCurrentUserProfile(editValues);
  assert.equal(editorSession.name, '기존 이름'); assert.equal(savedProfile.name, '기존 이름');
  assert.equal(editorSession.healthCondition, '건강');
  assert.equal(readCalls, 0);
  let finishOldRead;
  readOverride = () => new Promise(resolve => { finishOldRead = resolve; });
  const oldProfileRead = editor.refreshCurrentUserProfile();
  for (let i = 0; i < 10 && !finishOldRead; i++) await Promise.resolve();
  readOverride = null;
  await editor.saveCurrentUserProfile({ healthCondition: '건강 수정', healthGoal: '목표' });
  finishOldRead({ name: '기존 이름', healthCondition: '변경 전 건강 상태' }); await oldProfileRead;
  assert.equal(editorSession.healthCondition, '건강 수정');
  let finishPatch;
  patchGate = new Promise(resolve => { finishPatch = resolve; });
  const switchingEdit = editor.saveCurrentUserProfile(editValues);
  for (let i = 0; i < 12; i++) await Promise.resolve();
  editorSession = { userId: '2', name: '다른 계정' }; editorToken = 'other-token';
  finishPatch();
  await assert.rejects(switchingEdit, /로그인 정보가 변경/);
  assert.equal(editorSession.name, '다른 계정');
  console.log('PASS: health edits leave the name unchanged, avoid profile reads and isolate stale reads/accounts');

  let formSession = { userId: '1', name: '', healthCondition: '', healthGoal: '' };
  let failSave = false, backCalls = 0, formPayload;
  const editScreen = harness('app/profile-edit.tsx', {
    '@/utils/sessionProfile': { saveCurrentUserProfile: async payload => {
      formPayload = payload;
      if (failSave) throw new Error('프로필을 저장하지 못했어요.');
    } },
    '@expo/vector-icons': { MaterialCommunityIcons: 'Icon' }, 'expo-router': { useRouter: () => ({ back: () => { backCalls++; } }) },
    'react-native': { ActivityIndicator: 'ActivityIndicator', KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'android' },
      Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', View: 'View', StyleSheet: { create: value => value } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, '../constants/colors': { Colors: {} },
    '../hooks/useSession': { useSession: () => formSession },
    '../utils/apiError': { getApiErrorMessage: error => error.message },
  }, {});
  const field = label => editScreen.nodes().find(node => node.type === 'TextInput' && node.props.accessibilityLabel === label);
  const saveButton = () => editScreen.nodes().find(node => node.type === 'Pressable' && !node.props.accessibilityLabel);
  assert.equal(field('이름').props.editable, false);
  assert.equal(field('이름').props.onChangeText, undefined);
  field('건강 목표').props.onChangeText('입력 중인 목표');
  formSession = { ...formSession, name: '조회된 이름', healthGoal: '서버 목표' };
  editScreen.render();
  assert.equal(field('이름').props.value, '조회된 이름');
  assert.equal(field('건강 목표').props.value, '입력 중인 목표');
  failSave = true; saveButton().props.onPress(); await editScreen.flush();
  assert.equal('name' in formPayload, false); assert.equal(backCalls, 0);
  assert.ok(editScreen.nodes().includes('프로필을 저장하지 못했어요.'));
  failSave = false; saveButton().props.onPress(); await editScreen.flush();
  assert.equal(backCalls, 1);
  console.log('PASS: profile name stays read-only while health drafts and save error handling keep working');

  const cache = storage();
  let resolveFridges;
  const fridge = harness('contexts/FridgeContext.tsx', {
    '@react-native-async-storage/async-storage': { default: cache },
    '../api/fridgeApi': { getMyFridges: () => new Promise(resolve => { resolveFridges = resolve; }) },
    '../utils/apiError': { getApiErrorMessage: () => 'error' },
  }, { enabled: true, userId: '1', children: null });
  fridge.render({ enabled: false, userId: '1', children: null });
  resolveFridges([{ fridgeId: 17, fridgeName: '이전 계정 냉장고', isMain: true }]);
  await fridge.flush(); assert.equal(fridge.value.fridges.length, 0); assert.equal(fridge.value.currentFridge, null);
  cache.data.set('fridiet:fridge-preferences:v2:1', JSON.stringify({ aliases: {}, hiddenIds: [17] }));
  const other = harness('contexts/FridgeContext.tsx', {
    '@react-native-async-storage/async-storage': { default: cache },
    '../api/fridgeApi': { getMyFridges: async () => [{ fridgeId: 17, fridgeName: '공유 냉장고', isMain: true }] },
    '../utils/apiError': { getApiErrorMessage: () => 'error' },
  }, { enabled: true, userId: '2', children: null });
  await other.flush(); assert.equal(other.value.fridges.length, 1);
  assert.ok(cache.data.has('selected_fridge_id:v2:2'));
  const resolvers = [];
  const switching = harness('contexts/FridgeContext.tsx', {
    '@react-native-async-storage/async-storage': { default: cache },
    '../api/fridgeApi': { getMyFridges: () => new Promise(resolve => { resolvers.push(resolve); }) },
    '../utils/apiError': { getApiErrorMessage: () => 'error' },
  }, { enabled: true, userId: '10', children: null });
  switching.render({ enabled: true, userId: '11', children: null });
  assert.equal(switching.value.currentFridge, null);
  resolvers[1]([{ fridgeId: 200, fridgeName: '새 계정', isMain: true }]); await switching.flush();
  resolvers[0]([{ fridgeId: 100, fridgeName: '이전 계정', isMain: true }]); await switching.flush();
  assert.equal(switching.value.currentFridge.fridgeId, 200);
  console.log('PASS: logout cancels late fridge responses and preferences are account-scoped');

  const preferences = load('utils/notificationPreferences.ts', { '@react-native-async-storage/async-storage': { default: cache } });
  let failServer = true, failCache = false;
  const realSet = cache.setItem;
  cache.setItem = async (key, value) => { if (failCache) throw new Error('disk full'); return realSet(key, value); };
  const native = { ActivityIndicator: 'ActivityIndicator', Linking: { openSettings: async () => {} }, Platform: { OS: 'android' },
    AppState: { addEventListener: () => ({ remove() {} }) }, Pressable: 'Pressable', ScrollView: 'ScrollView', Switch: 'Switch', Text: 'Text', View: 'View', StyleSheet: { create: value => value } };
  const settings = harness('app/notification-settings.tsx', {
    '@expo/vector-icons': { MaterialCommunityIcons: 'Icon' }, 'expo-notifications': { getPermissionsAsync: async () => ({ status: 'granted' }) },
    'react-native': native, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '../components/SettingsScreenHeader': { default: 'Header' }, '../constants/colors': { Colors: {} },
    '../hooks/useSession': { useSession: () => ({ userId: 'settings-user' }) }, '../utils/notificationPreferences': preferences,
    '../utils/pushRegistration': { registerPushNotifications: async () => {} },
    '@/api/notificationApi': {
      getNotificationSettings: async () => ({ pushEnabled: false, expiryEnabled: false, fridgeActivityEnabled: false, notificationTime: '19:00' }),
      updateNotificationSettings: async () => { if (failServer) throw new Error('server unavailable'); },
    },
  }, {});
  await settings.flush();
  const switchRow = () => settings.nodes().find(node => node.props?.title === '전체 푸시 알림');
  assert.equal(switchRow().props.value, false);
  assert.ok(!settings.nodes().some(node => typeof node === 'string' && node.includes('서버 연동 전')));
  switchRow().props.onValueChange(true); await settings.flush();
  assert.equal(switchRow().props.value, false);
  assert.equal((await preferences.loadNotificationPreferences('settings-user')).pushEnabled, false);
  failServer = false; failCache = true;
  switchRow().props.onValueChange(true); await settings.flush();
  assert.equal(switchRow().props.value, true);
  assert.ok(settings.nodes().some(node => typeof node === 'string' && node.includes('설정은 서버에 저장됐지만')));
  failCache = false;
  console.log('PASS: server settings reach the UI; failed saves do not corrupt cache or roll back accepted settings');

  const cooking = harness('components/recipe/CookingCompleteModal.tsx', {
    axios: { isAxiosError: () => false },
    'react-native': { ...native, Modal: 'Modal', TextInput: 'TextInput' },
    '../../api/recipeApi': {
      previewRecipeConsumption: async () => ({ warnings: [], items: [{ stock: { batchId: 1, ingredientName: '두부', unitType: 'CUSTOM', customQuantityText: '한 통', remainingQuantity: null, unit: null }, quantityUsed: 0 }] }),
      completeRecipeCooking: async () => {},
    },
    '../../utils/apiError': { getApiErrorMessage: () => 'error' },
  }, { visible: true, fridgeId: 1, recipe: { recipeKey: 'recipe-1', recipeName: '두부 요리', ingredients: [] }, onClose() {}, onDone() {} });
  await cooking.flush();
  cooking.nodes().find(node => node.props?.accessibilityRole === 'checkbox').props.onPress();
  cooking.nodes().find(node => node.type === 'TextInput').props.onChangeText('반 통');
  const cookingText = cooking.nodes().filter(node => typeof node === 'string').join(' ');
  assert.ok(cookingText.includes('반 통')); assert.ok(!cookingText.includes('NaN'));
  console.log('PASS: custom-quantity preview shows text instead of NaN');

  let permission = 'denied', deviceUser = { userId: '1' }, auth = 'token-a';
  const registrations = [];
  const push = load('utils/pushRegistration.ts', {
    'expo-device': { isDevice: true }, 'react-native': { Platform: { OS: 'android' } },
    'expo-notifications': { AndroidImportance: { MAX: 5 }, setNotificationChannelAsync: async () => {},
      getPermissionsAsync: async () => ({ status: permission }), getDevicePushTokenAsync: async () => ({ data: 'device-token' }) },
    '../api/notificationApi': { registerFcmToken: async (...args) => registrations.push(args) },
    './token': { getSessionSnapshot: () => deviceUser, getToken: async () => auth },
  });
  await push.registerPushNotifications(); assert.equal(registrations.length, 0);
  permission = 'granted'; await push.registerPushNotifications();
  assert.deepEqual([...registrations[0]], ['device-token', 'token-a']);
  registrations.length = 0; permission = 'denied';
  let foreground;
  const notificationContext = harness('contexts/NotificationContext.tsx', {
    'expo-router': { useRouter: () => ({ push() {} }) },
    'expo-notifications': { setNotificationHandler() {},
      addNotificationReceivedListener: () => ({ remove() {} }), addNotificationResponseReceivedListener: () => ({ remove() {} }),
      addPushTokenListener: () => ({ remove() {} }) },
    'react-native': { AppState: { addEventListener: (_event, fn) => { foreground = fn; return { remove() {} }; } } },
    '../api/notificationApi': { getNotifications: async () => [], markNotificationRead: async () => {} },
    '../utils/apiError': { getApiErrorMessage: () => 'error' }, '../utils/pushRegistration': push,
  }, { enabled: true, children: null });
  await notificationContext.flush(); assert.equal(registrations.length, 0);
  permission = 'granted'; foreground('active'); await notificationContext.flush();
  assert.equal(registrations.length, 1);
  console.log('PASS: granting notification permission later registers the authenticated device');

  const accountStorage = storage();
  let releaseWrite, beginWrite;
  const began = new Promise(resolve => { beginWrite = resolve; });
  const originalSet = accountStorage.setItem;
  accountStorage.setItem = async (key, value) => {
    if (key === 'user_jwt_token') { beginWrite(); await new Promise(resolve => { releaseWrite = resolve; }); }
    return originalSet(key, value);
  };
  const session = load('utils/token.js', { '@react-native-async-storage/async-storage': { default: accountStorage } });
  const token = `x.${Buffer.from(JSON.stringify({ sub: '1', name: '홍길동', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.x`;
  const saving = session.saveToken(token, { loginProvider: 'KAKAO' });
  await began; const removing = session.removeToken(); releaseWrite(); await Promise.all([saving, removing]);
  assert.equal(session.getSessionSnapshot(), null); assert.equal(await session.getToken(), null);
  assert.equal(accountStorage.data.has('user_profile'), false);
  accountStorage.setItem = originalSet;
  await session.saveToken(token, { loginProvider: 'KAKAO' });
  assert.equal(session.getSessionSnapshot().name, '홍길동');
  await session.saveToken(token, { name: '', loginProvider: 'KAKAO' });
  assert.equal(session.getSessionSnapshot().name, '홍길동');
  console.log('PASS: pending login cannot restore logged-out credentials; Unicode names survive caching');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
