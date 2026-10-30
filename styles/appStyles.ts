import { StyleSheet } from "react-native";

import { Colors } from "../constants/colors";

export const tabLayoutStyles = StyleSheet.create({
  authLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
});

export const homeStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 120,
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
  },

  headerTextArea: {
    flex: 1,
  },

  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },

  greeting: {
    fontSize: 23,
    fontWeight: "700",
    color: Colors.text,
  },

  greetingSub: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.subText,
  },

  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginLeft: 8,
  },

  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: 1,
    right: 0,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.coralDark,
  },
  notificationBadgeText: { fontSize: 9, fontWeight: "700", color: Colors.white },

  /* COMMON */

  section: {
    marginBottom: 30,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },

  moreButton: {
    flexDirection: "row",
    alignItems: "center",
  },

  moreText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.main,
  },

  /* EXPIRATION */

  expirationCountBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.orange,
  },

  expirationCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.orange,
  },

  expirationCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 18,
    overflow: "hidden",
  },

  expirationRow: {
    minHeight: 110,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 14,
  },

  ingredientImageArea: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },

  ingredientImage: {
    width: 50,
    height: 50,
    resizeMode: "contain",
  },

  ingredientInfo: {
    flex: 1,
    marginLeft: 8,
  },

  ingredientNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 4,
  },

  ingredientName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },

  storageBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },

  storageBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.mainDark,
  },

  dday: {
    fontSize: 21,
    fontWeight: "700",
    color: Colors.coral,
    marginBottom: 2,
  },

  amount: {
    fontSize: 12,
    color: Colors.subText,
  },

  recommendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },

  recommendText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.coral,
  },
  inlineError: {
    marginTop: 7,
    paddingHorizontal: 8,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.coralDark,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.line,
  },

  expirationGuide: {
    minHeight: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    backgroundColor: Colors.background,
  },

  guideLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  guideText: {
    flex: 1,
    fontSize: 12,
    color: Colors.subText,
  },

  expirationEmpty: {
    minHeight: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  expirationEmptyText: {
    fontSize: 13,
    color: Colors.subText,
  },

  /* RECIPE */

  recipeCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 18,
    overflow: "hidden",
  },

  recipeImageArea: {
    height: 125,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },

  recipeContent: {
    padding: 16,
  },

  recipeTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },

  recipeDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.subText,
    marginBottom: 13,
  },

  recipeIngredientArea: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 13,
  },

  recipeIngredientItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },

  recipeIngredientIcon: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },

  recipeIngredientText: {
    fontSize: 11,
    color: Colors.mainDark,
  },

  recipeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  metaText: {
    fontSize: 11,
    color: Colors.subText,
  },

  recipeBottom: {
    minHeight: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    backgroundColor: Colors.background,
  },

  ingredientProgressArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  ingredientProgressText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.mainDark,
  },

  progressBackground: {
    width: 65,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.line,
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: Colors.main,
  },

  favoriteArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
  },

  favoriteText: {
    fontSize: 11,
    color: Colors.mainDark,
  },

  recipeEmpty: {
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 18,
    backgroundColor: Colors.white,
  },

  recipeEmptyText: {
    fontSize: 13,
    color: Colors.subText,
  },

  recipeRetryText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.coral,
  },

  /* CART */

  cartCountBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.main,
  },

  cartCountText: {
    fontSize: 11,
    color: Colors.mainDark,
  },

  cartCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 18,
    paddingHorizontal: 15,
  },

  cartRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
  },

  cartImage: {
    width: 34,
    height: 34,
    resizeMode: "contain",
    marginLeft: 10,
    marginRight: 12,
  },

  cartItemText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },

  cartQuantity: {
    fontSize: 12,
    color: Colors.subText,
  },

  cartDivider: {
    height: 1,
    backgroundColor: Colors.line,
  },

  addCartButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  addCartText: {
    fontSize: 13,
    color: Colors.subText,
  },

  cartEmpty: {
    minHeight: 62,
    justifyContent: "center",
  },

  cartEmptyText: {
    fontSize: 13,
    color: Colors.subText,
  },
});

export const fridgeStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  screen: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 170 },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    width: 38,
    height: 44,
    justifyContent: "center",
    alignItems: "flex-start",
    marginRight: 3,
  },
  fridgeSelector: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  qrActions: { flexDirection: "row", gap: 8, marginBottom: 16 },
  qrButtonText: { fontSize: 14, fontWeight: "700", color: Colors.mainStrong },
  qrButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: Colors.lightGreen,
  },
  fridgeName: {
    maxWidth: "85%",
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
  },
  searchBox: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.white,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    marginLeft: 8,
    fontSize: 16,
    color: Colors.text,
  },
  filterContainer: {
    height: 48,
    flexDirection: "row",
    marginBottom: 26,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 16,
    backgroundColor: Colors.white,
    overflow: "hidden",
  },
  filterButton: { flex: 1, justifyContent: "center", alignItems: "center" },
  selectedFilterButton: { backgroundColor: Colors.main, borderRadius: 15 },
  filterText: { fontSize: 13, color: Colors.text },
  selectedFilterText: { color: Colors.white, fontWeight: "700" },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
  },
  resultTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  resultCount: { fontSize: 14, fontWeight: "600", color: Colors.main },
  ingredientGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  ingredientCard: {
    width: "48%",
    minHeight: 200,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.white,
  },
  pressedCard: { opacity: 0.72 },
  cardMain: { flexDirection: "row", flex: 1, marginBottom: 8 },
  ingredientImageArea: {
    flex: 1.05,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 12,
  },
  ingredientImage: { width: 72, height: 72, resizeMode: "contain" },
  cardInfo: { flex: 0.95, minWidth: 0, alignItems: "flex-end", paddingTop: 2 },
  storageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.background,
    marginBottom: 10,
  },
  storageText: { fontSize: 10, fontWeight: "600", color: Colors.mainDark },
  ingredientName: {
    width: "100%",
    minHeight: 39,
    textAlign: "right",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  qrContainerMeta: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 4,
    marginBottom: 5,
  },
  qrContainerText: {
    flexShrink: 1,
    textAlign: "right",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
    color: Colors.blue,
  },
  quantity: {
    width: "100%",
    textAlign: "right",
    fontSize: 13,
    color: Colors.subText,
    marginBottom: 7,
  },
  dday: { width: "100%", textAlign: "right", fontSize: 20, fontWeight: "700" },
  expiryArea: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  expiryText: { flex: 1, fontSize: 10, color: Colors.subText },
  statePanel: {
    minHeight: 230,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
    borderRadius: 16,
    backgroundColor: Colors.white,
  },
  stateTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
  },
  stateDescription: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.subText,
    textAlign: "center",
  },
  stateButton: {
    marginTop: 18,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: Colors.main,
  },
  stateButtonText: { fontSize: 14, fontWeight: "700", color: Colors.white },
  addButton: {
    position: "absolute",
    right: 20,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    borderRadius: 25,
    backgroundColor: Colors.main,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  addButtonText: { fontSize: 14, fontWeight: "700", color: Colors.white },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(34, 34, 34, 0.38)",
  },
  sheet: {
    maxHeight: "82%",
    minHeight: 310,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Colors.white,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    alignSelf: "center",
    marginTop: 9,
    marginBottom: 8,
    borderRadius: 2,
    backgroundColor: Colors.line,
  },
  sheetHeader: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetIconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  fridgeList: { maxHeight: 260, marginTop: 8 },
  fridgeRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: Colors.softBackground,
  },
  fridgeRowSelected: { backgroundColor: Colors.lightGreen },
  fridgeRowSelect: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    paddingLeft: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  fridgeRowText: { flex: 1, minWidth: 0, fontSize: 15, color: Colors.text },
  fridgeRowTextSelected: { fontWeight: "700", color: Colors.mainDark },
  mainBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 9,
    overflow: "hidden",
    fontSize: 10,
    fontWeight: "700",
    color: Colors.mainDark,
    backgroundColor: Colors.white,
  },
  mainFridgeButton: {
    minWidth: 70,
    minHeight: 58,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  mainFridgeButtonText: { marginTop: 1, fontSize: 10, fontWeight: "700", color: Colors.subText },
  mainFridgeButtonTextActive: { color: Colors.orangeDark },
  fridgeManageButton: {
    width: 44,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: Colors.line,
  },
  sheetActions: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
  },
  sheetAction: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  sheetActionText: { flex: 1, fontSize: 15, fontWeight: "600", color: Colors.text },
  removedFridgeSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
  },
  removedFridgeTitle: {
    marginBottom: 5,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.subText,
  },
  removedFridgeRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  removedFridgeName: { flex: 1, fontSize: 14, color: Colors.subText },
  restoreFridgeButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.lightGreen,
  },
  restoreFridgeButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.mainDark,
  },
  manageFridgeForm: { paddingTop: 12 },
  manageFridgeSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.lightGreen,
  },
  manageFridgeIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  manageFridgeSummaryText: { flex: 1, minWidth: 0 },
  manageFridgeName: { fontSize: 16, fontWeight: "700", color: Colors.text },
  manageFridgeStatus: { marginTop: 3, fontSize: 12, color: Colors.mainDark },
  manageFieldLabel: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  manageSecondaryButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.orange,
    borderRadius: 14,
    backgroundColor: Colors.lightOrange,
  },
  manageSecondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.orangeDark,
  },
  manageDangerZone: {
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
  },
  manageDangerTitle: { fontSize: 13, fontWeight: "700", color: Colors.text },
  manageDangerDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.subText,
  },
  manageRemoveButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    borderRadius: 13,
    backgroundColor: Colors.lightCoral,
  },
  manageRemoveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.coralDark,
  },
  sheetForm: { paddingTop: 22 },
  sheetInput: {
    height: 52,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 14,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  formHint: { marginTop: 8, fontSize: 13, color: Colors.subText },
  formError: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.coral,
    textAlign: "center",
  },
  primaryButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 22,
    borderRadius: 14,
    backgroundColor: Colors.main,
  },
  primaryButtonText: { fontSize: 16, fontWeight: "700", color: Colors.white },
  disabledButton: { opacity: 0.45 },
  inviteContent: { alignItems: "center", paddingTop: 26 },
  inviteGuide: { fontSize: 14, color: Colors.subText, textAlign: "center" },
  inviteCode: {
    marginTop: 18,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 5,
    color: Colors.mainDark,
  },
  secondaryButton: {
    minHeight: 44,
    justifyContent: "center",
    marginTop: 18,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: Colors.main,
    borderRadius: 12,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: "700", color: Colors.mainDark },
});

export const cartStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.text,
  },

  description: {
    marginTop: 6,
    fontSize: 14,
    color: Colors.subText,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  errorText: {
    marginBottom: 10,
    color: "#D45845",
    fontSize: 13,
  },

  statusText: {
    marginBottom: 10,
    color: Colors.mainDark,
    fontSize: 13,
  },

  cartCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 17,
  },

  cartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },

  cartTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  cartTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
  },

  itemCount: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.main,
  },

  itemList: {
    marginTop: 2,
  },

  itemRow: {
    minHeight: 65,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  itemRowChecked: {
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderBottomColor: "transparent",
    backgroundColor: Colors.lightGreen,
  },

  lastItemRow: {
    borderBottomWidth: 0,
  },

  checkButton: {
    width: 32,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  categoryIcon: {
    width: 30,
    height: 30,
  },

  itemInfo: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 8,
  },

  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },

  checkedText: {
    color: Colors.mainStrong,
    textDecorationLine: "line-through",
  },
  purchasePendingText: { marginTop: 3, fontSize: 10, lineHeight: 15, fontWeight: "700", color: Colors.mainStrong },

  purchaseActionPanel: { marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: Colors.lightGreen },
  purchaseActionCopy: { marginBottom: 12 },
  purchaseActionTitle: { fontSize: 17, lineHeight: 22, fontWeight: "700", color: Colors.mainStrong },
  purchaseActionDescription: { marginTop: 4, fontSize: 12, lineHeight: 18, color: Colors.text },
  purchaseActionButton: { minHeight: 50, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: Colors.mainStrong },
  purchaseActionButtonText: { fontSize: 15, fontWeight: "700", color: Colors.white },

  quantity: {
    minWidth: 42,
    marginRight: 6,
    textAlign: "right",
    fontSize: 13,
    color: Colors.subText,
  },

  checkedQuantity: {
    color: "#AAAAAA",
    textDecorationLine: "line-through",
  },

  deleteButton: {
    width: 28,
    height: 36,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 42,
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },

  emptyText: {
    marginTop: 5,
    fontSize: 13,
    color: Colors.subText,
  },

  addButton: {
    height: 52,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.main,
    borderRadius: 14,
    backgroundColor: Colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  addButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.main,
  },

  addBox: {
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.white,
  },

  addBoxTitle: {
    marginBottom: 12,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  recentSection: { marginTop: 18, paddingHorizontal: 16, paddingVertical: 17, borderRadius: 18, backgroundColor: Colors.white },
  recentHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.line },
  recentTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  recentDescription: { marginTop: 4, fontSize: 12, lineHeight: 17, color: Colors.subText },
  recentClear: { minHeight: 40, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  recentClearText: { fontSize: 12, fontWeight: "700", color: Colors.mainStrong },
  recentRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: "#EEEEEE" },
  recentLastRow: { borderBottomWidth: 0 },
  recentIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: Colors.mainStrong },
  recentCopy: { flex: 1, minWidth: 0 },
  recentItemName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  recentMeta: { marginTop: 3, fontSize: 12, color: Colors.subText },
  recentTime: { marginTop: 3, fontSize: 11, color: Colors.mainStrong },
  recentRemove: { width: 40, height: 44, alignItems: "flex-end", justifyContent: "center" },
  recentError: { marginTop: 10, fontSize: 12, lineHeight: 18, color: Colors.coralDark, textAlign: "center" },

  inputRow: {
    flexDirection: "row",
    gap: 8,
  },

  input: {
    height: 46,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 12,
    backgroundColor: Colors.white,
    paddingHorizontal: 13,
    fontSize: 14,
    color: Colors.text,
  },

  nameInput: {
    flex: 1,
  },

  quantityInput: {
    width: 90,
  },

  addActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 8,
  },

  cancelButton: {
    height: 40,
    paddingHorizontal: 17,
    borderRadius: 10,
    backgroundColor: "#F1F1F1",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.subText,
  },

  confirmButton: {
    height: 40,
    paddingHorizontal: 19,
    borderRadius: 10,
    backgroundColor: Colors.main,
    alignItems: "center",
    justifyContent: "center",
  },

  confirmButtonDisabled: {
    backgroundColor: "#E7E7E7",
  },

  confirmButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },

  confirmButtonTextDisabled: {
    color: Colors.subText,
  },

  bottomContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },

  checkedCount: {
    marginBottom: 7,
    textAlign: "center",
    fontSize: 13,
    color: Colors.subText,
  },

  completeButton: {
    height: 54,
    borderRadius: 15,
    backgroundColor: Colors.main,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  completeButtonDisabled: {
    backgroundColor: "#E7E7E7",
  },

  completeButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.white,
  },

  completeButtonTextDisabled: {
    color: Colors.subText,
  },

  reviewModalRoot: { flex: 1, justifyContent: "flex-end" },
  reviewBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(34,34,34,0.42)" },
  reviewSheet: { maxHeight: "92%", minHeight: 460, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: Colors.background },
  reviewHandle: { width: 40, height: 4, marginTop: 9, marginBottom: 8, alignSelf: "center", borderRadius: 2, backgroundColor: Colors.line },
  reviewHeader: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  reviewHeaderCopy: { flex: 1, minWidth: 0 },
  reviewTitle: { fontSize: 20, fontWeight: "700", color: Colors.text },
  reviewDescription: { marginTop: 5, fontSize: 12, lineHeight: 18, color: Colors.subText },
  reviewClose: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  reviewContent: { paddingHorizontal: 20, paddingBottom: 22, gap: 12 },
  reviewItem: { padding: 16, borderRadius: 16, backgroundColor: Colors.white },
  reviewItemHeading: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 5 },
  reviewItemIcon: { width: 34, height: 34 },
  reviewItemName: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 21, fontWeight: "700", color: Colors.text },
  recipeRequirement: { minHeight: 54, marginTop: 10, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: Colors.lightOrange },
  recipeRequirementCopy: { flex: 1, minWidth: 0 },
  recipeRequirementLabel: { fontSize: 11, fontWeight: "700", color: Colors.orangeDark },
  recipeRequirementValue: { marginTop: 2, fontSize: 14, lineHeight: 19, fontWeight: "700", color: Colors.text },
  recipeRequirementHint: { fontSize: 11, fontWeight: "700", color: Colors.orangeDark },
  reviewLabel: { marginTop: 13, marginBottom: 7, fontSize: 12, fontWeight: "700", color: Colors.subText },
  reviewInputRow: { minHeight: 46, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: Colors.line, borderRadius: 12, backgroundColor: Colors.softBackground },
  reviewInput: { flex: 1, minWidth: 0, height: 44, fontSize: 16, color: Colors.text },
  reviewUnit: { marginLeft: 8, fontSize: 13, fontWeight: "700", color: Colors.mainStrong },
  reviewChoiceRow: { flexDirection: "row", gap: 8 },
  reviewChoice: { flex: 1, minHeight: 42, borderWidth: 1, borderColor: Colors.line, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: Colors.softBackground },
  reviewChoiceSelected: { borderColor: Colors.mainStrong, backgroundColor: Colors.lightGreen },
  reviewChoiceText: { fontSize: 13, fontWeight: "600", color: Colors.subText },
  reviewChoiceTextSelected: { color: Colors.mainStrong },
  reviewDateInput: { height: 46, paddingHorizontal: 13, borderWidth: 1, borderColor: Colors.line, borderRadius: 12, backgroundColor: Colors.softBackground, fontSize: 16, color: Colors.text },
  reviewInputError: { borderColor: Colors.coralDark, backgroundColor: Colors.lightCoral },
  reviewError: { fontSize: 13, lineHeight: 19, color: Colors.coralDark, textAlign: "center" },
  reviewFooter: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18, backgroundColor: Colors.background },
  reviewSubmit: { minHeight: 54, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: Colors.mainStrong },

  coupangButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#E53935",
    marginLeft: 4,
  },

  coupangButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.white,
  },

  kurlyButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#6C3BAA",
    marginLeft: 4,
  },

  kurlyButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.white,
  },
});

export const mypageStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingVertical: 32,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 28,
  },

  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  profileCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.main,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },

  profileCopy: {
    flex: 1,
    minWidth: 0,
  },

  profileInitial: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: "700",
  },

  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },

  userInfo: {
    flexShrink: 1,
    fontSize: 13,
    color: Colors.subText,
  },

  loginIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  loginProviderIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },

  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 28,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  infoLabel: {
    fontSize: 14,
    color: Colors.subText,
  },

  infoValue: {
    flex: 1,
    marginLeft: 16,
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "right",
  },

  infoDivider: {
    height: 1,
    backgroundColor: Colors.line,
    marginVertical: 14,
  },

  section: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },

  menuItem: {
    height: 44,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  menuText: {
    fontSize: 14,
    color: Colors.text,
  },

  menuItemDisabled: {
    opacity: 0.7,
  },

  readyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: "hidden",
    borderRadius: 10,
    backgroundColor: Colors.softBackground,
    fontSize: 11,
    fontWeight: "700",
    color: Colors.subText,
  },

  menuAccessory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  arrow: {
    fontSize: 22,
    color: Colors.subText,
  },

  logoutButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.main,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },

  logoutText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
  },

  withdrawButton: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
  },

  withdrawText: {
    fontSize: 12,
    color: Colors.subText,
  },
});

export const notificationStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  /* HEADER */

  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },

  headerRight: {
    width: 40,
    height: 40,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  /* CONTENT */

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  section: {
    marginTop: 20,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },

  /* NOTIFICATION */

  notificationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },

  readNotificationCard: {
    backgroundColor: Colors.background,
  },

  digestCard: {
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 16,
    backgroundColor: Colors.white,
  },

  digestHeading: { flexDirection: "row", alignItems: "flex-start" },
  digestList: { marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.line },
  digestRow: { minHeight: 38, flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 6 },
  digestLabel: { width: 62, fontSize: 12, lineHeight: 18, fontWeight: "700", color: Colors.orangeDark },
  digestLabelUrgent: { color: Colors.coralDark },
  digestIngredients: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 19, color: Colors.text },

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  expiryIcon: {
    backgroundColor: "#FFF0EB",
  },

  fridgeIcon: {
    backgroundColor: "#EEF3E8",
  },

  notificationContent: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  notificationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    lineHeight: 21,
  },

  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.coral,
    marginLeft: 8,
    marginTop: 6,
  },

  notificationMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.subText,
    marginTop: 5,
  },

  notificationTime: {
    fontSize: 11,
    color: Colors.subText,
    marginTop: 8,
  },

  errorBanner: {
    minHeight: 54,
    marginTop: 8,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: Colors.lightCoral,
  },
  errorBannerText: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 18, color: Colors.coralDark },
  errorBannerAction: { fontSize: 12, fontWeight: "700", color: Colors.coralDark },

  /* EMPTY */

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 150,
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },

  emptyDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.subText,
    textAlign: "center",
  },
});

export const addIngredientStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screen: {
    flex: 1,
  },
  header: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  headerSide: {
    width: 42,
    height: 42,
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
    gap: 24,
  },
  field: {
    gap: 9,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  input: {
    height: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 14,
    backgroundColor: Colors.white,
    color: Colors.text,
  },
  row: {
    flexDirection: "row",
    gap: 7,
  },
  choice: {
    flex: 1,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 11,
    backgroundColor: Colors.white,
  },
  choiceSelected: {
    borderColor: Colors.main,
    backgroundColor: Colors.lightGreen,
  },
  choiceText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.subText,
  },
  choiceTextSelected: {
    color: Colors.mainDark,
    fontWeight: "700",
  },
  counter: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 30,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 14,
    backgroundColor: Colors.white,
  },
  counterButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: Colors.lightGreen,
  },
  count: {
    minWidth: 40,
    textAlign: "center",
    fontSize: 19,
    fontWeight: "700",
    color: Colors.text,
  },
  dateBox: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 14,
    backgroundColor: Colors.white,
  },
  dateInput: {
    flex: 1,
    height: "100%",
    color: Colors.text,
  },
  receipt: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 15,
    backgroundColor: Colors.white,
  },
  receiptText: {
    flex: 1,
  },
  receiptTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  subText: {
    marginTop: 3,
    fontSize: 10,
    color: Colors.subText,
  },
  bottom: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: Colors.background,
  },
  addButton: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: Colors.main,
  },
  disabled: {
    backgroundColor: Colors.line,
  },
  addText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.white,
  },
  percentBox: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 14,
    backgroundColor: Colors.white,
  },

  percentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  percentLabel: {
    fontSize: 12,
    color: Colors.subText,
  },

  percentValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.mainDark,
  },

  slider: {
    width: "100%",
    height: 40,
  },

  percentRange: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  percentRangeText: {
    fontSize: 10,
    color: Colors.subText,
  },

  keyboardView: {
    flex: 1,
  },
  receiptSheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.28)",
  },
  receiptSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  receiptSheet: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: Colors.background,
  },
  receiptSheetHandle: {
    width: 40,
    height: 4,
    alignSelf: "center",
    marginBottom: 18,
    borderRadius: 2,
    backgroundColor: Colors.line,
  },
  receiptSheetTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: Colors.text,
  },
  receiptSheetDescription: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.subText,
  },
  receiptSourceButton: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.white,
  },
  receiptSourceButtonPressed: {
    opacity: 0.7,
  },
  receiptSourceIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: Colors.lightGreen,
  },
  receiptSourceText: {
    flex: 1,
  },
  receiptSourceTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  receiptSourceDescription: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.subText,
  },
  receiptSheetCancel: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  receiptSheetCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.subText,
  },
});

export const ingredientDetailStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 30,
  },

  header: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },

  backText: {
    fontSize: 36,
    lineHeight: 36,
    color: Colors.text,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },

  headerSpace: {
    width: 40,
  },

  titleSection: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 24,
  },

  ingredientName: {
    fontSize: 25,
    fontWeight: "700",
    color: Colors.text,
  },

  expirationText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.coral,
  },

  editGuide: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.subText,
  },

  detailCard: {
    marginHorizontal: 20,
    paddingHorizontal: 20,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.line,
  },

  detailRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },

  lastDetailRow: {
    borderBottomWidth: 0,
  },

  detailLabel: {
    width: 90,
    fontSize: 15,
    fontWeight: "600",
    color: Colors.subText,
  },

  detailValue: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    textAlign: "right",
  },

  editCard: {
    marginHorizontal: 20,
    padding: 18,
    gap: 22,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 16,
  },

  editField: {
    gap: 9,
  },

  editLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },

  readonlyBox: {
    height: 48,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: Colors.lightGreen,
  },

  readonlyText: {
    fontSize: 14,
    color: Colors.text,
  },

  input: {
    height: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 12,
    backgroundColor: Colors.white,
    color: Colors.text,
  },

  choiceRow: {
    flexDirection: "row",
    gap: 7,
  },

  choice: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 10,
    backgroundColor: Colors.white,
  },

  choiceSelected: {
    borderColor: Colors.main,
    backgroundColor: Colors.lightGreen,
  },

  choiceText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.subText,
  },

  choiceTextSelected: {
    color: Colors.mainDark,
    fontWeight: "700",
  },

  percentInputBox: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },

  percentInput: {
    flex: 1,
    height: "100%",
    color: Colors.text,
    fontSize: 15,
  },

  percentSymbol: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.mainDark,
  },

  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 28,
    paddingHorizontal: 20,
  },

  editButton: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: Colors.main,
  },

  editButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.white,
  },

  deleteButton: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.coral,
    backgroundColor: Colors.white,
  },

  deleteButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.coral,
  },

  cancelButton: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.white,
  },

  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.subText,
  },

  saveButton: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: Colors.main,
  },

  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.white,
  },

  pressedButton: {
    opacity: 0.7,
  },

  disabledButton: {
    opacity: 0.5,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  loadingText: {
    fontSize: 14,
    color: Colors.subText,
  },
});

export const receiptReviewStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  header: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  headerSide: { width: 42, height: 42, justifyContent: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  receiptImage: {
    width: "100%",
    height: 150,
    borderRadius: 16,
    resizeMode: "cover",
    backgroundColor: Colors.line,
  },
  intro: { paddingVertical: 20 },
  introTitle: { fontSize: 19, fontWeight: "700", color: Colors.text },
  introText: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.subText,
  },
  itemList: { gap: 14 },
  itemCard: {
    padding: 16,
    gap: 15,
    borderRadius: 16,
    backgroundColor: Colors.white,
  },
  itemCardExcluded: { opacity: 0.52 },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  selectToggle: { flexDirection: "row", alignItems: "center", gap: 5 },
  selectText: { fontSize: 13, color: Colors.subText },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: Colors.lightGreen,
  },
  successText: { fontSize: 12, fontWeight: "700", color: Colors.mainDark },
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: "700", color: Colors.text },
  input: {
    height: 46,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  twoColumns: { flexDirection: "row", gap: 10 },
  column: { flex: 1 },
  storageRow: { flexDirection: "row", gap: 6 },
  storageButton: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 10,
  },
  storageButtonSelected: {
    borderColor: Colors.main,
    backgroundColor: Colors.lightGreen,
  },
  storageText: { fontSize: 12, color: Colors.subText },
  storageTextSelected: { fontWeight: "700", color: Colors.mainDark },
  itemError: { fontSize: 13, lineHeight: 18, color: Colors.coral },
  stateBox: {
    minHeight: 230,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: Colors.white,
  },
  stateTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
  },
  stateDescription: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.subText,
    textAlign: "center",
  },
  stateAction: {
    minHeight: 44,
    justifyContent: "center",
    marginTop: 17,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: Colors.main,
  },
  stateActionText: { fontSize: 14, fontWeight: "700", color: Colors.white },
  bottomBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  retakeButton: {
    flex: 0.8,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.main,
    borderRadius: 14,
  },
  retakeButtonText: { fontSize: 15, fontWeight: "700", color: Colors.mainDark },
  registerButton: {
    flex: 1.2,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: Colors.main,
  },
  registerButtonText: { fontSize: 16, fontWeight: "700", color: Colors.white },
  disabled: { opacity: 0.45 },
});
