const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, imports = {}, globals = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, allowJs: true } });
  vm.runInNewContext(outputText, { exports, atob, TextDecoder, console, ...globals, require: name => {
    if (name.endsWith('.png')) return name;
    assert.ok(name in imports, `Unexpected import: ${name}`);
    return imports[name];
  } });
  return exports;
}
const data = new Map();
let failWrite = false;
const storage = { getItem: async key => data.get(key) ?? null, setItem: async (key, value) => { if (failWrite) throw new Error('disk full'); data.set(key, value); }, removeItem: async key => data.delete(key), multiRemove: async keys => keys.forEach(key => data.delete(key)) };
function recipeHarness(userId, api) {
  const slots = []; let index = 0; let pending = []; let output; let dirty = false;
  const changed = (a, b) => !a || b.some((v, i) => !Object.is(v, a[i]));
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useContext: () => output.props.value,
    useState(initial) { const i = index++; if (!slots[i]) slots[i] = { value: initial }; return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; dirty = true; }]; },
    useRef(value) { const i = index++; if (!slots[i]) slots[i] = { value: { current: value } }; return slots[i].value; },
    useCallback(fn, deps) { const i = index++; if (changed(slots[i]?.deps, deps)) slots[i] = { value: fn, deps }; return slots[i].value; },
    useEffect(fn, deps) { const i = index++; if (changed(slots[i]?.deps, deps)) { slots[i] = { deps }; pending.push(fn); } },
  };
  let id = 0;
  const module = load('contexts/RecipeContext.tsx', { react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) }, 'expo-crypto': { randomUUID: () => `${userId}-${++id}` }, '@react-native-async-storage/async-storage': { default: storage }, '../api/recipeApi': api });
  const render = () => { let n = 0; do { assert.ok(++n < 20); dirty = false; index = 0; pending = []; output = module.RecipeProvider({ userId, children: null }); pending.forEach(fn => fn()); } while (dirty); };
  render();
  return { get value() { render(); return output.props.value; }, async flush() { for (let i = 0; i < 12; i++) { await Promise.resolve(); render(); } } };
}
async function main() {
  const featuresOff = load('constants/features.ts', {}, { process: { env: {} } });
  assert.equal(featuresOff.Features.accountRecovery, false);
  assert.equal(featuresOff.Features.containerSplit, false);
  assert.equal(featuresOff.Features.mealMutations, false);
  const featuresOn = load('constants/features.ts', {}, { process: { env: { EXPO_PUBLIC_ENABLE_ACCOUNT_RECOVERY: 'true', EXPO_PUBLIC_ENABLE_CONTAINER_SPLIT: 'TRUE', EXPO_PUBLIC_ENABLE_MEAL_MUTATIONS: ' true ' } } });
  assert.equal(featuresOn.Features.accountRecovery, true);
  assert.equal(featuresOn.Features.containerSplit, true);
  assert.equal(featuresOn.Features.mealMutations, true);
  const quantities = load('utils/inventoryQuantity.ts');
  const countDraft = { mode: 'count', count: 3, unit: '개', percent: 100, customText: '' };
  assert.deepEqual(Array.from(quantities.quantityModes, mode => mode.label), ['개수', '퍼센트', '직접 입력']);
  assert.equal(quantities.validateQuantityDraft(countDraft), true);
  assert.deepEqual({ ...quantities.toQuantityPayload(countDraft) }, { unitType: 'QUANTITY', remainingQuantity: 3, unit: '개', customQuantityText: null, countBasis: null, perCountQuantity: null, perCountUnit: null, quantityNeedsReview: false });
  assert.deepEqual({ ...quantities.toQuantityPayload({ ...countDraft, mode: 'percent', percent: 65 }) }, { unitType: 'PERCENT', remainingQuantity: 65, unit: '%', customQuantityText: null });
  assert.deepEqual({ ...quantities.toQuantityPayload({ ...countDraft, mode: 'custom', customText: '1/2통' }) }, { unitType: 'CUSTOM', remainingQuantity: null, unit: null, customQuantityText: '1/2통' });
  assert.equal(quantities.toQuantityPayload({ ...countDraft, count: 0.5 }).remainingQuantity, 0.5);
  assert.equal(quantities.validateQuantityDraft({ ...countDraft, unit: '봉' }), false);
  const verifiedCount = quantities.toQuantityPayload({ ...countDraft, countBasis: '봉지', perCountQuantity: 500, perCountUnit: 'g' });
  assert.equal(verifiedCount.perCountQuantity, 500);
  assert.equal(verifiedCount.countBasis, '봉지');
  assert.equal(quantities.validateQuantityDraft({ ...countDraft, perCountQuantity: -1, perCountUnit: 'g' }), false);
  assert.equal(quantities.validateQuantityDraft({ ...countDraft, mode: 'percent', percent: 105 }), false);
  for (const value of ['반 통', '조금', '300g', '1/2통', '  반 통  ', '가'.repeat(40)]) {
    const draft = { ...countDraft, mode: 'custom', customText: value };
    assert.equal(quantities.validateQuantityDraft(draft), true);
    assert.deepEqual({ ...quantities.toQuantityPayload(draft) }, { unitType: 'CUSTOM', remainingQuantity: null, unit: null, customQuantityText: value.trim() });
  }
  for (const value of ['', '   ', '가'.repeat(41)]) {
    const draft = { ...countDraft, mode: 'custom', customText: value };
    assert.equal(quantities.validateQuantityDraft(draft), false);
    assert.throws(() => quantities.toQuantityPayload(draft));
  }
  // Exercise typing and stepping through the actual shared quantity control.
  let typedCountState = null;
  let quantityValue = { ...countDraft };
  const jsx = (type, props) => ({ type, props });
  const selector = load('components/QuantitySelector.tsx', {
    react: { useState: () => [typedCountState, next => { typedCountState = next; }] },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': { Pressable: 'Pressable', Text: 'Text', TextInput: 'TextInput', View: 'View', StyleSheet: { create: styles => styles } },
    '@expo/vector-icons': { MaterialCommunityIcons: 'Icon' },
    '@react-native-community/slider': { default: 'Slider' },
    '../constants/colors': { Colors: {} },
    '../utils/inventoryQuantity': quantities,
  });
  function quantityNodes(disabled = false) {
    const nodes = [];
    function visit(node) {
      if (Array.isArray(node)) { node.forEach(visit); return; }
      if (!node || typeof node !== 'object') return;
      nodes.push(node);
      visit(node.props?.children);
    }
    visit(selector.QuantitySelector({ value: quantityValue, onChange: next => { quantityValue = next; }, disabled }));
    return nodes;
  }
  const countField = () => quantityNodes().find(node => node.props?.accessibilityLabel === '개수 직접 입력');
  countField().props.onChangeText('12');
  assert.equal(quantities.toQuantityPayload(quantityValue).remainingQuantity, 12);
  quantityNodes().find(node => node.props?.accessibilityLabel === '수량 1 늘리기').props.onPress();
  assert.equal(countField().props.value, '13');
  quantityNodes().find(node => node.props?.accessibilityLabel === '수량 1 줄이기').props.onPress();
  assert.equal(countField().props.value, '12');
  countField().props.onChangeText('');
  assert.equal(countField().props.value, '');
  assert.equal(quantities.validateQuantityDraft(quantityValue), false);
  countField().props.onChangeText('0.');
  assert.equal(countField().props.value, '0.');
  countField().props.onChangeText('0.5');
  assert.equal(quantities.toQuantityPayload(quantityValue).remainingQuantity, 0.5);
  for (const invalid of ['abc', '-2', '1.2.3']) countField().props.onChangeText(invalid);
  assert.equal(countField().props.value, '0.5');
  quantityValue = { ...quantityValue, count: 7 };
  assert.equal(countField().props.value, '7');
  assert.equal(quantityNodes(true).find(node => node.props?.accessibilityLabel === '개수 직접 입력').props.editable, false);
  const availability = load('utils/inventoryAvailability.ts');
  const recommendations = load('utils/inventoryRecommendation.ts', { './inventoryAvailability': availability });
  const inventory = [
    { batchId: 2, ingredientName: '양파', dDay: 2, remainingQuantity: 1, customQuantityText: null, consumeByDate: '2026-09-17', status: 'ACTIVE', isConsumed: false },
    { batchId: 1, ingredientName: '두부', dDay: 0, remainingQuantity: 50, customQuantityText: null, consumeByDate: '2026-09-15', status: 'ACTIVE', isConsumed: false },
    { batchId: 3, ingredientName: '우유', dDay: 5, remainingQuantity: 1, customQuantityText: null, consumeByDate: '2026-09-20', status: 'ACTIVE', isConsumed: false },
    { batchId: 4, ingredientName: '치즈', dDay: -1, remainingQuantity: 1, customQuantityText: null, consumeByDate: '2026-09-14', status: 'EXPIRED', isConsumed: false, unitType: 'QUANTITY', unit: '개', locationCategory: 'REFRIGERATED' },
  ];
  assert.equal(availability.isUsableInventory(inventory[3]), true);
  assert.equal(availability.isUsableInventory({ ...inventory[3], status: 'CONSUMED' }), false);
  assert.equal(recommendations.getUrgentIngredient(inventory).ingredientName, '두부');
  const fingerprint = recommendations.inventoryCompositionFingerprint(7, inventory);
  assert.equal(fingerprint, recommendations.inventoryCompositionFingerprint(7, [...inventory].reverse()));
  assert.notEqual(fingerprint, recommendations.inventoryCompositionFingerprint(7, inventory.map(item => item.batchId === 1 ? { ...item, remainingQuantity: 40 } : item)));
  assert.ok(recommendations.homeRecommendationFingerprint(7, 1, inventory).endsWith('urgent:1'));
  const dates = load('utils/dateInput.ts');
  assert.equal(dates.formatDateInput('20260913'), '2026-09-13');
  assert.equal(dates.formatDateInput('2026-09-1'), '2026-09-1');
  assert.equal(dates.formatDateInput('2026/09/13'), '2026-09-13');
  assert.equal(dates.formatDateInput(''), '');
  assert.equal(dates.isValidDateInput('2024-02-29'), true);
  for (const date of ['2026-02-29', '2026-13-01', '2026-04-31', '2026-09', '0000-01-01']) assert.equal(dates.isValidDateInput(date), false);
  const notificationUtils = load('utils/notifications.ts');
  const notificationSections = notificationUtils.buildNotificationSections([
    { id: 1, type: 'expiry', title: '우유의 소비기한이 오늘까지예요', message: '', time: '오전 9:00', dateGroup: '오늘', isRead: false },
    { id: 2, type: 'expiry', title: '계란의 소비기한이 2일 남았어요', message: '', time: '오전 9:00', dateGroup: '오늘', isRead: true },
    { id: 3, type: 'fridge', title: '두부가 추가되었어요', message: '', time: '어제', dateGroup: '어제', isRead: false },
  ]);
  assert.equal(notificationSections.length, 2);
  assert.deepEqual([...notificationSections[0].digest.buckets[0].ingredients], ['우유']);
  assert.equal(notificationSections[0].digest.buckets[1].daysLeft, 2);
  assert.equal(notificationSections[0].digest.isRead, false);
  const notificationPreferences = load('utils/notificationPreferences.ts', { '@react-native-async-storage/async-storage': { default: storage } });
  const defaults = await notificationPreferences.loadNotificationPreferences('settings-user-a');
  assert.deepEqual({ ...defaults }, { pushEnabled: true, expiryEnabled: true, fridgeActivityEnabled: true, expirySlot: '09:00' });
  const evening = { ...defaults, expiryEnabled: false, expirySlot: '19:00' };
  await notificationPreferences.saveNotificationPreferences('settings-user-a', evening);
  assert.deepEqual({ ...(await notificationPreferences.loadNotificationPreferences('settings-user-a')) }, evening);
  assert.deepEqual({ ...(await notificationPreferences.loadNotificationPreferences('settings-user-b')) }, { ...defaults });
  data.set(notificationPreferences.notificationPreferencesKey('settings-user-c'), '{broken json');
  assert.deepEqual({ ...(await notificationPreferences.loadNotificationPreferences('settings-user-c')) }, { ...defaults });
  data.set(notificationPreferences.notificationPreferencesKey('settings-user-d'), JSON.stringify({ ...defaults, expirySlot: '10:00' }));
  assert.deepEqual({ ...(await notificationPreferences.loadNotificationPreferences('settings-user-d')) }, { ...defaults });
  failWrite = true;
  await assert.rejects(notificationPreferences.saveNotificationPreferences('settings-user-a', defaults));
  failWrite = false;
  const cooking = load('utils/recipeCooking.ts', { './inventoryAvailability': availability });
  const cookingInventory = [
    { batchId: 2, ingredientName: '두부', unitType: 'QUANTITY', unit: 'g', remainingQuantity: 300, consumeByDate: '2026-10-02', status: 'ACTIVE', isConsumed: false },
    { batchId: 1, ingredientName: ' 두부 ', unitType: 'QUANTITY', unit: 'g', remainingQuantity: 100, consumeByDate: '2026-09-30', status: 'ACTIVE', isConsumed: false },
    { batchId: 3, ingredientName: '두부', unitType: 'QUANTITY', unit: '개', remainingQuantity: 1, consumeByDate: '2026-09-29', status: 'ACTIVE', isConsumed: false },
  ];
  const cookingDraft = cooking.buildCookingDrafts([{ id: null, ingredientMasterId: null, nameText: '두부', quantity: 150, unit: 'g', optional: false }], cookingInventory)[0];
  assert.equal(cookingDraft.batchId, 1);
  assert.equal(cookingDraft.value, '100');
  assert.equal(cooking.cookingDraftIsValid(cookingDraft, cookingInventory), true);
  assert.equal(cooking.cookingDraftIsValid({ ...cookingDraft, value: '101' }, cookingInventory), false);
  const recentPurchases = load('utils/recentPurchases.ts', { '@react-native-async-storage/async-storage': { default: storage } });
  const recent = Array.from({ length: 22 }, (_, index) => ({ id: String(index), itemId: index, itemName: `품목 ${index}`, quantityText: '1개', locationCategory: 'REFRIGERATED', expirationDate: '2026-10-01', completedAt: '2026-09-28T12:00:00.000Z' }));
  assert.equal(recentPurchases.mergeRecentPurchases([], recent).length, 20);
  await recentPurchases.storeRecentPurchases('1', 7, recent);
  assert.equal((await recentPurchases.loadRecentPurchases('1', 7)).length, 20);
  const generatedNames = ['두부 볶음', '두부 볶음', '두부 구이', '두부 조림'];
  let recommendationCalls = 0;
  const recipeApi = load('api/recipeApi.ts', { './client': { default: { post: async () => ({ data: { recipeId: null, ownerUserId: 1, recipeName: generatedNames[recommendationCalls++], cookTime: 10, isGenerated: true, description: null, memo: null, stepsJson: '[]', ingredients: [], createdAt: null, recommendationScore: null, scoreBreakdown: null, recommendationReasons: [], availableIngredients: [], missingIngredients: [] } }) } } });
  const generated = await recipeApi.generateAiRecipes({ fridgeId: 7, targetIngredients: [], additionalIngredients: [], excludeIngredients: [] }, { limit: 3, maxAttempts: 5 });
  assert.deepEqual([...generated.map(item => item.recipeName)], ['두부 볶음', '두부 구이', '두부 조림']);
  assert.equal(recommendationCalls, 4);
  const recipeIngredients = load('utils/recipeIngredients.ts', { './inventoryAvailability': availability });
  const derivedMissing = recipeIngredients.getRecipeMissingIngredientNames({
    recipeId: null, ownerUserId: 1, recipeName: '테스트', cookTime: 10, isGenerated: true, description: null, memo: null, stepsJson: '[]', createdAt: null, recommendationScore: null, scoreBreakdown: null, recommendationReasons: [],
    availableIngredients: ['두부'], missingIngredients: [' 소금 '],
    ingredients: [
      { id: null, ingredientMasterId: null, nameText: '두부', quantity: 1, unit: '모', optional: false },
      { id: null, ingredientMasterId: null, nameText: '양파', quantity: 1, unit: '개', optional: false },
      { id: null, ingredientMasterId: null, nameText: '후추', quantity: 1, unit: '꼬집', optional: true },
    ],
  });
  assert.deepEqual([...derivedMissing], ['소금', '양파']);
  const displayIngredients = recipeIngredients.getRecipeDisplayIngredients({
    recipeId: null, ownerUserId: 1, recipeName: '누락 재료 테스트', cookTime: 10, isGenerated: true, description: null, memo: null, stepsJson: '[]', createdAt: null, recommendationScore: null, scoreBreakdown: null, recommendationReasons: [],
    availableIngredients: ['두부'], missingIngredients: ['양파', '대파', '마늘', '간장', '참기름'],
    ingredients: [
      { id: null, ingredientMasterId: null, nameText: '두부', quantity: 1, unit: '모', optional: false },
      { id: null, ingredientMasterId: null, nameText: '양파', quantity: 1, unit: '개', optional: false },
    ],
  });
  assert.equal(displayIngredients.length, 6);
  assert.deepEqual(displayIngredients.filter(item => item.inferred).map(item => item.nameText), ['대파', '마늘', '간장', '참기름']);
  const inventoryQuantity = load('utils/inventoryQuantity.ts');
  assert.equal(inventoryQuantity.quantityDraftFromInventory({ unitType: 'PERCENT', remainingQuantity: 35, unit: '%', customQuantityText: null }).mode, 'percent');
  assert.equal(inventoryQuantity.quantityDraftFromInventory({ unitType: 'CUSTOM', remainingQuantity: null, unit: null, customQuantityText: '반 통' }).customText, '반 통');
  assert.deepEqual(
    { ...inventoryQuantity.quantityDraftFromInventory({ unitType: 'QUANTITY', remainingQuantity: 300, unit: 'g', customQuantityText: null }) },
    { mode: 'custom', count: 1, percent: 100, customText: '300g', unit: '개' },
  );
  const resolvedInventory = recipeIngredients.resolveRecipeInventory({
    recipeId: null, ownerUserId: 1, recipeName: '현재 재고 테스트', cookTime: 10, isGenerated: true, description: null, memo: null, stepsJson: '[]', createdAt: null, recommendationScore: null, scoreBreakdown: null, recommendationReasons: [],
    availableIngredients: ['두부'], missingIngredients: ['양파', '마늘'],
    ingredients: [
      { id: null, ingredientMasterId: null, nameText: '두부', quantity: 1, unit: '모', optional: false },
      { id: null, ingredientMasterId: null, nameText: '양파', quantity: 1, unit: '개', optional: false },
      { id: null, ingredientMasterId: null, nameText: '후추', quantity: 1, unit: '꼬집', optional: true },
    ],
  }, [
    { batchId: 1, ingredientMasterId: null, ingredientName: '두부', status: 'CONSUMED', isConsumed: true },
    { batchId: 2, ingredientMasterId: null, ingredientName: '양파', status: 'EXPIRED', isConsumed: false },
  ]);
  assert.deepEqual(resolvedInventory.ownedIngredients.map(item => item.nameText), []);
  assert.deepEqual(resolvedInventory.missingIngredients.map(item => item.nameText), ['두부', '양파', '마늘']);
  assert.deepEqual(resolvedInventory.optionalIngredients.map(item => item.nameText), ['후추']);
  assert.deepEqual([...recipeIngredients.getRecipeCartIngredients(resolvedInventory, new Set()).map(item => item.nameText)], ['두부', '양파', '마늘']);
  assert.deepEqual([...recipeIngredients.getRecipeCartIngredients(resolvedInventory, new Set(['후추'])).map(item => item.nameText)], ['두부', '양파', '마늘', '후추']);
  const quantityResolved = recipeIngredients.resolveRecipeInventory({
    availableIngredients: ['양파', '치즈'], missingIngredients: [],
    ingredients: [
      { ingredientMasterId: null, nameText: '양파', quantity: 100, unit: 'g', optional: false },
      { ingredientMasterId: null, nameText: '치즈', quantity: 1, unit: '장', optional: false },
      { ingredientMasterId: null, nameText: '당근', quantity: 100, unit: 'g', optional: false },
    ],
    ingredientBalances: [{ name: '양파', status: 'SHORTAGE' }, { name: '치즈', status: 'UNKNOWN' }, { name: '당근', status: 'ENOUGH' }],
  }, [
    { ingredientName: '양파', ingredientMasterId: null, status: 'ACTIVE', consumeByDate: '2099-01-01' },
    { ingredientName: '치즈', ingredientMasterId: null, status: 'ACTIVE', consumeByDate: '2099-01-01' },
    { ingredientName: '당근', ingredientMasterId: null, status: 'ACTIVE', consumeByDate: '2000-01-01' },
  ]);
  assert.deepEqual(quantityResolved.ownedIngredients.map(item => item.nameText), []);
  assert.deepEqual(quantityResolved.missingIngredients.map(item => item.nameText), ['양파', '당근']);
  assert.equal(quantityResolved.ingredients.find(item => item.nameText === '치즈').availability, 'REVIEW');
  assert.deepEqual([...recipeIngredients.getRecipeCartIngredients(quantityResolved, new Set()).map(item => item.nameText)], ['양파', '당근']);
  const optionalOwned = recipeIngredients.resolveRecipeInventory({
    recipeId: null, ownerUserId: 1, recipeName: '선택 재료 보유 테스트', cookTime: 10, isGenerated: true, description: null, memo: null, stepsJson: '[]', createdAt: null, recommendationScore: null, scoreBreakdown: null, recommendationReasons: [], availableIngredients: [], missingIngredients: [],
    ingredients: [{ id: null, ingredientMasterId: null, nameText: '후추', quantity: 1, unit: '꼬집', optional: true }],
  }, [{ batchId: 3, ingredientMasterId: null, ingredientName: '후추', status: 'ACTIVE', isConsumed: false }]);
  assert.equal(optionalOwned.optionalIngredients[0].owned, true);
  assert.equal(recipeIngredients.getRecipeCartIngredients(optionalOwned, new Set(['후추'])).length, 0);
  const cartPurchase = load('utils/cartPurchase.ts', { './inventoryQuantity': inventoryQuantity });
  const recipeCartItem = { sourceType: 'RECIPE', unitType: 'QUANTITY', quantity: 30, unit: 'g', customQuantityText: null };
  assert.deepEqual({ ...cartPurchase.purchaseQuantityDraftFromCartItem(recipeCartItem) }, { mode: 'count', count: 1, percent: 100, customText: '', unit: '개' });
  const manualCartItem = { sourceType: 'MANUAL', unitType: 'QUANTITY', quantity: 500, unit: 'g', customQuantityText: null };
  assert.deepEqual({ ...cartPurchase.purchaseQuantityDraftFromCartItem(manualCartItem) }, { mode: 'custom', count: 1, percent: 100, customText: '500g', unit: '개' });
  assert.deepEqual({ ...cartPurchase.purchaseQuantityPayload({ mode: 'percent', count: 1, percent: 60, customText: '', unit: '개' }) },
    { unitType: 'PERCENT', quantity: 60, unit: '%', countBasis: undefined, perCountQuantity: undefined, perCountUnit: undefined, quantityNeedsReview: undefined });
  assert.deepEqual({ ...cartPurchase.purchaseQuantityPayload({ ...countDraft, count: 0.5, perCountQuantity: 500, perCountUnit: 'g', countBasis: '봉지' }) },
    { unitType: 'QUANTITY', quantity: 0.5, unit: '개', perCountQuantity: 500, perCountUnit: 'g', countBasis: '봉지', quantityNeedsReview: false });
  assert.equal(cartPurchase.purchaseQuantityText({ mode: 'custom', count: 1, percent: 100, customText: '1/2병', unit: '개' }), '1/2병');
  const qr = load('utils/qrQuantity.ts');
  assert.equal(qr.calculateQrUsage(1, '0.5', 'used').nextRemaining, 0.5);
  assert.equal(qr.calculateQrUsage(0.3, '0.1', 'remaining').quantityUsed, 0.2);
  assert.equal(qr.calculateQrUsage(100, '25', 'remaining').quantityUsed, 75);
  assert.equal(qr.calculateQrUsage(2, '0', 'remaining').nextRemaining, 0);
  for (const input of ['', '3', '-1', 'NaN', 'Infinity', '0x1', '1e0']) assert.ok(qr.calculateQrUsage(2, input, 'used').error);
  assert.ok(qr.calculateQrUsage(null, '1', 'used').error);
  assert.ok(qr.calculateQrUsage(2, '2', 'remaining').error);
  assert.deepEqual(
    { ...qr.prepareQrDeduction('QUANTITY', 5, '2', 'used').payload },
    { unitType: 'QUANTITY', quantityUsed: 2 },
  );
  assert.deepEqual(
    { ...qr.prepareQrDeduction('PERCENT', 80, '25', 'remaining').payload },
    { unitType: 'PERCENT', quantityUsed: 55 },
  );
  assert.deepEqual(
    { ...qr.prepareQrDeduction('CUSTOM', null, ' 반 통 ', 'remaining').payload },
    { unitType: 'CUSTOM', customText: '반 통' },
  );
  assert.ok(qr.prepareQrDeduction('CUSTOM', null, '   ', 'remaining').error);
  const icons = load('constants/ingredientIcons.ts', { 'react-native': {} });
  assert.ok(icons.getIngredientIcon('fruit', '사과').endsWith('individual/apple.png'));
  assert.ok(icons.getIngredientIcon('fruit', '사 과').endsWith('individual/apple.png'));
  assert.ok(icons.getIngredientIcon('fruit', '청포도').endsWith('common/fruit.png'));
  assert.ok(icons.getIngredientIcon('vegetable', '애호박 볶음').endsWith('common/vegetable.png'));
  assert.ok(icons.getIngredientIcon('bread', '식빵').endsWith('individual/bread.png'));
  assert.ok(icons.getIngredientIcon('bread', '치아바타').endsWith('common/bread.png'));
  assert.ok(icons.getIngredientIcon('unknown', '알 수 없는 재료').endsWith('common/etc.png'));
  assert.ok(icons.getIngredientIcon(undefined, undefined).endsWith('common/etc.png'));
  // API responses supply names but may omit both icon metadata fields.
  for (const [name, expected] of [['양파', 'individual/onion.png'], ['애호박', 'individual/zucchini.png'], ['고구마', 'individual/sweet_potato.png'], ['사 과', 'individual/apple.png'], ['계란', 'common/egg.png'], ['두부', 'common/tofu.png']]) {
    assert.ok(icons.getIngredientIcon(null, undefined, name).endsWith(expected));
    assert.ok(icons.getIngredientIcon('etc', null, name).endsWith(expected));
  }
  assert.ok(icons.getIngredientIcon('vegetable', '알 수 없음', '양파').endsWith('individual/onion.png'));
  assert.ok(icons.getIngredientIcon('fruit', '사과', '양파').endsWith('individual/apple.png'));
  assert.ok(icons.getIngredientIcon('meat', null, '알 수 없는 고기').endsWith('common/meat.png'));
  for (const name of ['알 수 없는 재료', '감자칩', 'constructor', '__proto__']) {
    assert.ok(icons.getIngredientIcon(null, null, name).endsWith('common/etc.png'));
  }
  const iconComponent = load('components/IngredientIcon.tsx', {
    'react-native': { Image: 'Image' },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    '../constants/ingredientIcons': icons,
  });
  assert.ok(iconComponent.IngredientIcon({ name: '양파' }).props.source.endsWith('individual/onion.png'));
  const iconSource = fs.readFileSync(path.join(root, 'constants/ingredientIcons.ts'), 'utf8');
  for (const match of iconSource.matchAll(/require\(["']([^"']+)["']\)/g)) assert.ok(fs.existsSync(path.resolve(root, 'constants', match[1])), match[1]);
  for (const directory of ['common', 'individual']) {
    for (const file of fs.readdirSync(path.join(root, 'assets', 'icons', directory)).filter(name => name.endsWith('.png'))) {
      assert.ok(iconSource.includes(`../assets/icons/${directory}/${file}`), `${directory}/${file} is not registered`);
    }
  }
  function checkImageReferences(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { checkImageReferences(file); continue; }
      if (!/\.(tsx?|js)$/.test(file)) continue;
      for (const match of fs.readFileSync(file, 'utf8').matchAll(/require\(["']([^"']+\.png)["']\)/g)) assert.ok(fs.existsSync(path.resolve(path.dirname(file), match[1])), `${file}: ${match[1]}`);
    }
  }
  for (const directory of ['app', 'components', 'constants']) checkImageReferences(path.join(root, directory));
  const config = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
  assert.ok(config.plugins.includes('expo-notifications'));
  assert.ok(fs.existsSync(path.resolve(root, config.icon)));
  assert.ok(fs.existsSync(path.resolve(root, config.web.favicon)));
  for (const plugin of config.plugins) if (Array.isArray(plugin) && plugin[0] === 'expo-splash-screen') assert.ok(fs.existsSync(path.resolve(root, plugin[1].image)));
  const token = (id, email = '') => `x.${Buffer.from(JSON.stringify({ sub: String(id), email, exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url')}.x`;
  const session = load('utils/token.js', { '@react-native-async-storage/async-storage': { default: storage } });
  const unicodeToken = `x.${Buffer.from(JSON.stringify({ sub: '99', name: '한글 이름', healthCondition: '없음', healthGoal: '균형식', exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url')}.x`;
  await session.saveToken(unicodeToken);
  assert.equal(session.getSessionSnapshot().name, '한글 이름');
  assert.equal(session.getSessionSnapshot().healthCondition, '없음');
  assert.equal(session.getSessionSnapshot().healthGoal, '균형식');
  await session.removeToken({ forgetSocialProvider: true });
  await session.saveToken(token(1, 'serim@example.com'), { name: '세림', healthGoal: '고단백', loginProvider: 'KAKAO', socialProvider: 'KAKAO' });
  assert.equal(session.getSessionSnapshot().name, '세림');
  assert.equal(session.getSessionSnapshot().email, 'serim@example.com');
  assert.equal(session.getSessionSnapshot().socialProvider, 'KAKAO');
  await session.updateSessionProfile({ healthCondition: '저염', healthGoal: '균형식' });
  assert.equal(session.getSessionSnapshot().healthCondition, '저염');
  const restarted = load('utils/token.js', { '@react-native-async-storage/async-storage': { default: storage } });
  await restarted.hydrateSession(); assert.equal(restarted.getSessionSnapshot().name, '세림');
  assert.equal(restarted.getLinkedProvider(restarted.getSessionSnapshot()), 'KAKAO');
  await session.saveToken(token(2)); assert.equal(session.getSessionSnapshot().name, '');
  assert.equal(session.getLinkedProvider(session.getSessionSnapshot()), '');
  await session.updateSessionProfile({ socialProvider: 'GOOGLE' });
  assert.equal(session.getLinkedProvider(session.getSessionSnapshot()), 'GOOGLE');
  await session.removeToken(); assert.equal(session.getSessionSnapshot(), null);
  assert.equal(data.has('user_profile'), false);
  assert.equal(data.has('user_jwt_token'), false);
  await session.saveToken(token(1), { loginProvider: 'EMAIL' });
  assert.equal(session.getLinkedProvider(session.getSessionSnapshot()), 'KAKAO');
  await session.saveToken(token(2), { loginProvider: 'EMAIL' });
  assert.equal(session.getLinkedProvider(session.getSessionSnapshot()), 'GOOGLE');
  await session.removeToken({ forgetSocialProvider: true });
  await session.saveToken(token(2));
  assert.equal(session.getLinkedProvider(session.getSessionSnapshot()), '');
  await session.saveToken(token(1));
  assert.equal(session.getLinkedProvider(session.getSessionSnapshot()), 'KAKAO');
  // Migrate an old profile that predates the per-account provider cache.
  data.set('user_jwt_token', token(3));
  data.set('user_profile', JSON.stringify({ userId: '3', name: '', email: '', healthCondition: '', healthGoal: '', loginProvider: 'GOOGLE' }));
  const migrated = load('utils/token.js', { '@react-native-async-storage/async-storage': { default: storage } });
  await migrated.hydrateSession();
  assert.equal(migrated.getLinkedProvider(migrated.getSessionSnapshot()), 'GOOGLE');
  await migrated.removeToken();
  await migrated.saveToken(token(3));
  assert.equal(migrated.getLinkedProvider(migrated.getSessionSnapshot()), 'GOOGLE');
  // A profile from another account must never supply the provider on hydration.
  data.set('user_jwt_token', token(4));
  const mismatched = load('utils/token.js', { '@react-native-async-storage/async-storage': { default: storage } });
  await mismatched.hydrateSession();
  assert.equal(mismatched.getLinkedProvider(mismatched.getSessionSnapshot()), '');
  let saves = 0; let failApi = false;
  const api = { saveAiRecipe: async () => { saves++; if (failApi) throw new Error('API failed'); return { recipeId: saves }; } };
  const recipe = { recipeId: null, ownerUserId: 1, recipeName: '두부 볶음', cookTime: 10, stepsJson: '[]', ingredients: [], availableIngredients: [], missingIngredients: [], recommendationReasons: [], recommendationScore: null, description: null, memo: null };
  const a = recipeHarness('1', api); await a.flush();
  const id = a.value.remember(recipe); assert.equal(a.value.remember(recipe), id);
  await a.value.setFavorite(id, true, 1); assert.equal(a.value.entries[0].favorite, true); assert.equal(saves, 1);
  await a.value.setFavorite(id, false, 1); await a.value.setFavorite(id, true, 1); assert.equal(saves, 1);
  const restored = recipeHarness('1', api); await restored.flush(); assert.equal(restored.value.entries[0].favorite, true);
  const b = recipeHarness('2', api); await b.flush(); assert.equal(b.value.entries.length, 0);
  const second = a.value.remember({ ...recipe, recipeName: '두부 구이' }); failWrite = true;
  await assert.rejects(a.value.setFavorite(second, true, 1)); assert.equal(a.value.entries.find(e => e.id === second).favorite, false);
  const count = saves; failWrite = false; await a.value.setFavorite(second, true, 1); assert.equal(saves, count);
  const third = a.value.remember({ ...recipe, recipeName: '실패 테스트' }); failApi = true;
  await assert.rejects(a.value.setFavorite(third, true, 1)); assert.equal(a.value.entries.find(e => e.id === third).favorite, false);
  console.log('PASS: feature flags, quantities, dates, notification digests, cooking matches, icons, sessions and favorite recovery');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
