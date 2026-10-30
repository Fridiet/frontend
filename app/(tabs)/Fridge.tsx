import { IngredientIcon } from "../../components/IngredientIcon";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { getInventories } from "../../api/inventoryApi";
import { Colors } from "../../constants/colors";
import { useFridge } from "../../contexts/FridgeContext";
import type { InventoryItem } from "../../types/fridge";
import { getApiErrorMessage } from "../../utils/apiError";
import { fridgeStyles as styles } from "../../styles/appStyles";


type StorageFilter =
  | "all"
  | "REFRIGERATED"
  | "FROZEN"
  | "ROOM_TEMP"
  | "SEASONING";
type SheetMode = "list" | "create" | "join" | "invite" | "manage";

const storageFilters: { key: StorageFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "REFRIGERATED", label: "냉장" },
  { key: "FROZEN", label: "냉동" },
  { key: "ROOM_TEMP", label: "상온" },
  { key: "SEASONING", label: "조미료" },
];

const storageLabels: Record<string, string> = {
  REFRIGERATED: "냉장",
  FROZEN: "냉동",
  ROOM_TEMP: "상온",
  ROOM_TEMPERATURE: "상온",
  SEASONING: "조미료",
};

function normalizedStorage(value: string) {
  return value === "ROOM_TEMPERATURE" ? "ROOM_TEMP" : value;
}

function consumeByTime(value: string) {
  const time = Date.parse(`${value}T00:00:00`);
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function quantityText(item: InventoryItem) {
  if (item.unitType === "CUSTOM") {
    return item.customQuantityText || "수량 미입력";
  }
  if (item.remainingQuantity === null) return "수량 미입력";
  return `${item.remainingQuantity}${item.unit ?? ""}${item.countBasis ? ` (${item.countBasis})` : ""}${item.quantityNeedsReview ? " · 수량 확인 필요" : ""}`;
}

export default function FridgeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    fridges,
    removedFridges,
    currentFridge,
    loading: fridgeLoading,
    error: fridgeError,
    refreshFridges,
    selectFridge,
    setMainFridge,
    renameFridge,
    removeFridge,
    restoreFridge,
    createFridge,
    joinFridge,
    createInviteCode,
  } = useFridge();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] =
    useState<StorageFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>("list");
  const [fridgeName, setFridgeName] = useState("");
  const [managedFridgeId, setManagedFridgeId] = useState<number | null>(null);
  const [managedFridgeName, setManagedFridgeName] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadInventory = useCallback(
    async (showSpinner = true) => {
      if (!currentFridge) {
        setItems([]);
        return;
      }
      if (showSpinner) setLoading(true);
      setInventoryError(null);

      try {
        setItems(await getInventories(currentFridge.fridgeId));
      } catch (error) {
        setInventoryError(
          getApiErrorMessage(error, "재료 목록을 불러오지 못했습니다."),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentFridge],
  );

  useFocusEffect(
    useCallback(() => {
      void loadInventory();
    }, [loadInventory]),
  );

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLocaleLowerCase("ko-KR");
    return items
      .filter((item) => {
        const matchesStorage =
          selectedFilter === "all" ||
          normalizedStorage(item.locationCategory) === selectedFilter;
        const matchesKeyword =
          !keyword ||
          item.ingredientName.toLocaleLowerCase("ko-KR").includes(keyword);
        return matchesStorage && matchesKeyword;
      })
      .sort((a, b) => {
        const aConsumeByTime = consumeByTime(a.consumeByDate);
        const bConsumeByTime = consumeByTime(b.consumeByDate);

        if (aConsumeByTime !== bConsumeByTime) {
          return aConsumeByTime - bConsumeByTime;
        }
        return a.batchId - b.batchId;
      });
  }, [items, searchText, selectedFilter]);


  const openSheet = () => {
    setSheetMode("list");
    setActionError(null);
    setInviteCode("");
    setManagedFridgeId(null);
    setManagedFridgeName("");
    setSheetVisible(true);
  };

  const closeSheet = () => {
    if (actionLoading) return;
    setSheetVisible(false);
    setFridgeName("");
    setInviteInput("");
    setInviteCode("");
    setActionError(null);
  };

  const closeSheetAfterAction = () => {
    setSheetVisible(false);
    setFridgeName("");
    setInviteInput("");
    setActionError(null);
  };

  const handleCreate = async () => {
    if (!fridgeName.trim() || actionLoading) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await createFridge(fridgeName);
      closeSheetAfterAction();
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, "냉장고를 만들지 못했습니다."),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteInput.trim() || actionLoading) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await joinFridge(inviteInput);
      closeSheetAfterAction();
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, "초대 코드로 참여하지 못했습니다."),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleInvite = async () => {
    if (actionLoading) return;
    setSheetMode("invite");
    setActionLoading(true);
    setActionError(null);
    setInviteCode("");
    try {
      setInviteCode(await createInviteCode());
    } catch (error) {
      setActionError(
        getApiErrorMessage(
          error,
          "냉장고 소유자만 초대 코드를 만들 수 있어요.",
        ),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetMain = async (fridgeId: number) => {
    if (actionLoading) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await setMainFridge(fridgeId);
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, "대표 냉장고를 변경하지 못했습니다."),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRename = async () => {
    if (!managedFridgeId || !managedFridgeName.trim() || actionLoading) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await renameFridge(managedFridgeId, managedFridgeName);
      setSheetMode("list");
      setManagedFridgeId(null);
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, "냉장고 이름을 변경하지 못했습니다."),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = (fridgeId: number, fridgeName: string) => {
    if (actionLoading) return;
    Alert.alert(
      "냉장고를 목록에서 제거할까요?",
      `${fridgeName}은 이 기기의 목록에서만 사라집니다. 서버의 냉장고와 재료는 삭제되지 않으며 나중에 복원할 수 있어요.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "목록에서 제거",
          style: "destructive",
          onPress: () => {
            setActionLoading(true);
            setActionError(null);
            void removeFridge(fridgeId)
              .then(() => {
                setSheetMode("list");
                setManagedFridgeId(null);
              })
              .catch((error) => {
                setActionError(
                  getApiErrorMessage(error, "냉장고를 제거하지 못했습니다."),
                );
              })
              .finally(() => setActionLoading(false));
          },
        },
      ],
    );
  };

  const handleRestore = async (fridgeId: number) => {
    if (actionLoading) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await restoreFridge(fridgeId);
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, "냉장고를 복원하지 못했습니다."),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const shareInvite = async () => {
    if (!inviteCode || !currentFridge) return;
    await Share.share({
      message: `${currentFridge.fridgeName} 초대 코드: ${inviteCode}`,
      title: "Fridiet 냉장고 초대",
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    const refreshTask = fridgeError
      ? refreshFridges()
      : loadInventory(false);
    void refreshTask.finally(() => setRefreshing(false));
  };

  const screenError = fridgeError || inventoryError;
  const isInitialLoading = fridgeLoading || loading;

  const handleAddIngredient = () => {
    if (currentFridge) {
      router.push("/ingredient/add");
      return;
    }

    Alert.alert(
      "냉장고 연결이 필요해요",
      fridgeError ||
        "재료를 추가하려면 먼저 사용할 냉장고 정보를 불러와야 합니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "다시 시도",
          onPress: () => void refreshFridges(),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.main}
              colors={[Colors.main]}
            />
          }
        >
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityLabel="뒤로 가기"
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={34}
                color={Colors.text}
              />
            </Pressable>
            <Pressable
              style={styles.fridgeSelector}
              onPress={openSheet}
              accessibilityRole="button"
              accessibilityLabel="냉장고 선택 및 관리"
            >
              <Text style={styles.fridgeName} numberOfLines={1}>
                {currentFridge?.fridgeName ?? "냉장고 불러오는 중"}
              </Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={24}
                color={Colors.text}
              />
            </Pressable>
          </View>

          <View style={styles.qrActions}>
            <Pressable style={styles.qrButton} onPress={() => router.push("/qr-scanner" as Href)} accessibilityRole="button" accessibilityLabel="용기 QR 스캔">
              <MaterialCommunityIcons name="qrcode-scan" size={21} color={Colors.mainStrong} />
              <Text style={styles.qrButtonText}>QR 스캔</Text>
            </Pressable>
            <Pressable style={styles.qrButton} onPress={() => router.push("/qr-generator" as Href)} accessibilityRole="button" accessibilityLabel="용기 QR 만들기">
              <MaterialCommunityIcons name="qrcode-plus" size={21} color={Colors.mainStrong} />
              <Text style={styles.qrButtonText}>QR 만들기</Text>
            </Pressable>
          </View>

          <View style={styles.searchBox}>
            <MaterialCommunityIcons
              name="magnify"
              size={23}
              color={Colors.subText}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="재료 검색"
              placeholderTextColor={Colors.subText}
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
            />
          </View>

          <View style={styles.filterContainer}>
            {storageFilters.map((filter) => {
              const selected = selectedFilter === filter.key;
              return (
                <Pressable
                  key={filter.key}
                  style={[
                    styles.filterButton,
                    selected && styles.selectedFilterButton,
                  ]}
                  onPress={() => setSelectedFilter(filter.key)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selected && styles.selectedFilterText,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>보관 중인 재료</Text>
            <Text style={styles.resultCount}>{filteredItems.length}개</Text>
          </View>

          {isInitialLoading ? (
            <StatePanel
              icon="fridge-outline"
              title="냉장고를 정리하고 있어요"
              description="재료 정보를 불러오는 중입니다."
              loading
            />
          ) : screenError ? (
            <StatePanel
              icon="wifi-alert"
              title="냉장고를 불러오지 못했어요"
              description={screenError}
              actionLabel="다시 시도"
              onAction={() =>
                void (fridgeError ? refreshFridges() : loadInventory())
              }
            />
          ) : filteredItems.length === 0 ? (
            <StatePanel
              icon={searchText || selectedFilter !== "all" ? "magnify" : "sprout"}
              title={
                searchText || selectedFilter !== "all"
                  ? "조건에 맞는 재료가 없어요"
                  : "첫 재료를 채워볼까요?"
              }
              description={
                searchText || selectedFilter !== "all"
                  ? "검색어나 보관 위치를 바꿔보세요."
                  : "직접 입력하거나 영수증을 촬영해 추가할 수 있어요."
              }
              actionLabel={
                searchText || selectedFilter !== "all" ? undefined : "재료 추가"
              }
              onAction={
                searchText || selectedFilter !== "all"
                  ? undefined
                  : () => router.push("/ingredient/add")
              }
            />
          ) : (
            <View style={styles.ingredientGrid}>
              {filteredItems.map((item) => (
                <Pressable
                  key={item.batchId}
                  style={({ pressed }) => [
                    styles.ingredientCard,
                    pressed && styles.pressedCard,
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: "/ingredient/[id]",
                      params: { id: String(item.batchId) },
                    })
                  }
                >
                  <View style={styles.cardMain}>
                    <View style={styles.ingredientImageArea}>
                      <IngredientIcon name={item.ingredientName} category={item.category} iconName={item.iconName} style={styles.ingredientImage} />
                    </View>
                    <View style={styles.cardInfo}>
                      <View style={styles.storageBadge}>
                        <Text style={styles.storageText}>
                          {storageLabels[item.locationCategory] ?? "기타"}
                        </Text>
                      </View>
                      <Text style={styles.ingredientName} numberOfLines={2}>
                        {item.ingredientName}
                      </Text>
                      {item.qrLinked === true || item.containerId != null ? (
                        <View style={styles.qrContainerMeta}>
                          <MaterialCommunityIcons
                            name="qrcode"
                            size={12}
                            color={Colors.blue}
                          />
                          <Text style={styles.qrContainerText} numberOfLines={1}>
                            {item.containerName?.trim()
                              ? `QR · ${item.containerName.trim()}`
                              : "QR 용기"}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={styles.quantity} numberOfLines={1}>
                        {quantityText(item)}
                      </Text>
                      <Text
                        style={[
                          styles.dday,
                          {
                            color:
                              item.dDay !== null && item.dDay <= 1
                                ? Colors.coral
                                : item.dDay !== null && item.dDay <= 5
                                  ? Colors.orange
                                  : Colors.mainDark,
                          },
                        ]}
                      >
                        {item.dDayText ?? "날짜 없음"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.expiryArea}>
                    <MaterialCommunityIcons
                      name="calendar-outline"
                      size={13}
                      color={Colors.subText}
                    />
                    <Text style={styles.expiryText} numberOfLines={1}>
                      소비기한 {item.consumeByDate || "미입력"}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <Pressable
          style={[styles.addButton, { bottom: 82 + insets.bottom }]}
          onPress={handleAddIngredient}
          accessibilityLabel="재료 추가"
        >
          <MaterialCommunityIcons name="plus" size={25} color={Colors.white} />
          <Text style={styles.addButtonText}>재료 추가</Text>
        </Pressable>

        <FridgeSheet
          visible={sheetVisible}
          mode={sheetMode}
          fridges={fridges}
          removedFridges={removedFridges}
          currentFridgeId={currentFridge?.fridgeId ?? null}
          fridgeName={fridgeName}
          managedFridgeId={managedFridgeId}
          managedFridgeName={managedFridgeName}
          inviteInput={inviteInput}
          inviteCode={inviteCode}
          loading={actionLoading}
          error={actionError}
          onClose={closeSheet}
          onModeChange={(mode) => {
            setSheetMode(mode);
            setActionError(null);
          }}
          onFridgeNameChange={setFridgeName}
          onManagedFridgeNameChange={setManagedFridgeName}
          onInviteInputChange={setInviteInput}
          onSelect={async (id) => {
            await selectFridge(id);
            closeSheet();
          }}
          onSetMain={(id) => void handleSetMain(id)}
          onManage={(fridge) => {
            setManagedFridgeId(fridge.fridgeId);
            setManagedFridgeName(fridge.fridgeName);
            setActionError(null);
            setSheetMode("manage");
          }}
          onRename={handleRename}
          onRemove={handleRemove}
          onRestore={(id) => void handleRestore(id)}
          onCreate={handleCreate}
          onJoin={handleJoin}
          onInvite={handleInvite}
          onShare={shareInvite}
        />
      </View>
    </SafeAreaView>
  );
}

type StatePanelProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
};

function StatePanel(props: StatePanelProps) {
  return (
    <View style={styles.statePanel}>
      {props.loading ? (
        <ActivityIndicator size="large" color={Colors.main} />
      ) : (
        <MaterialCommunityIcons name={props.icon} size={40} color={Colors.main} />
      )}
      <Text style={styles.stateTitle}>{props.title}</Text>
      <Text style={styles.stateDescription}>{props.description}</Text>
      {props.actionLabel && props.onAction ? (
        <Pressable style={styles.stateButton} onPress={props.onAction}>
          <Text style={styles.stateButtonText}>{props.actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type FridgeSheetProps = {
  visible: boolean;
  mode: SheetMode;
  fridges: { fridgeId: number; fridgeName: string; isMain: boolean }[];
  removedFridges: { fridgeId: number; fridgeName: string; isMain: boolean }[];
  currentFridgeId: number | null;
  fridgeName: string;
  managedFridgeId: number | null;
  managedFridgeName: string;
  inviteInput: string;
  inviteCode: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onModeChange: (mode: SheetMode) => void;
  onFridgeNameChange: (value: string) => void;
  onManagedFridgeNameChange: (value: string) => void;
  onInviteInputChange: (value: string) => void;
  onSelect: (id: number) => void;
  onSetMain: (id: number) => void;
  onManage: (fridge: { fridgeId: number; fridgeName: string; isMain: boolean }) => void;
  onRename: () => void;
  onRemove: (id: number, name: string) => void;
  onRestore: (id: number) => void;
  onCreate: () => void;
  onJoin: () => void;
  onInvite: () => void;
  onShare: () => void;
};

function FridgeSheet(props: FridgeSheetProps) {
  const managedFridge = props.fridges.find(
    (fridge) => fridge.fridgeId === props.managedFridgeId,
  );
  const title =
    props.mode === "list"
      ? "냉장고 선택"
      : props.mode === "create"
        ? "새 냉장고"
        : props.mode === "join"
          ? "초대 코드로 참여"
          : props.mode === "invite"
            ? "사용자 초대"
            : "냉장고 설정";

  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="slide"
      onRequestClose={props.onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={props.onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            {props.mode !== "list" ? (
              <Pressable
                style={styles.sheetIconButton}
                onPress={() => props.onModeChange("list")}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={28}
                  color={Colors.text}
                />
              </Pressable>
            ) : (
              <View style={styles.sheetIconButton} />
            )}
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable style={styles.sheetIconButton} onPress={props.onClose}>
              <MaterialCommunityIcons name="close" size={23} color={Colors.text} />
            </Pressable>
          </View>

          {props.mode === "list" ? (
            <>
              <Text style={styles.formHint}>
                냉장고를 눌러 잠시 전환하거나 별을 눌러 앱의 대표 냉장고로 지정하세요.
              </Text>
              {props.error ? <Text style={styles.formError}>{props.error}</Text> : null}
              <ScrollView style={styles.fridgeList}>
                {props.fridges.map((fridge) => {
                  const selected = fridge.fridgeId === props.currentFridgeId;
                  return (
                    <View
                      key={fridge.fridgeId}
                      style={[
                        styles.fridgeRow,
                        selected && styles.fridgeRowSelected,
                      ]}
                    >
                      <Pressable
                        style={styles.fridgeRowSelect}
                        onPress={() => props.onSelect(fridge.fridgeId)}
                        disabled={props.loading}
                        accessibilityRole="button"
                        accessibilityLabel={`${fridge.fridgeName} 냉장고 선택`}
                      >
                        <MaterialCommunityIcons
                          name="fridge-outline"
                          size={24}
                          color={selected ? Colors.mainDark : Colors.subText}
                        />
                        <Text
                          style={[
                            styles.fridgeRowText,
                            selected && styles.fridgeRowTextSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {fridge.fridgeName}
                        </Text>
                        {selected ? (
                          <MaterialCommunityIcons name="check" size={22} color={Colors.main} />
                        ) : null}
                      </Pressable>
                      <Pressable
                        style={styles.mainFridgeButton}
                        onPress={() => props.onSetMain(fridge.fridgeId)}
                        disabled={props.loading || fridge.isMain}
                        accessibilityRole="button"
                        accessibilityState={{ selected: fridge.isMain, disabled: fridge.isMain }}
                        accessibilityLabel={fridge.isMain ? `${fridge.fridgeName}, 대표 냉장고` : `${fridge.fridgeName}을 대표 냉장고로 설정`}
                      >
                        <MaterialCommunityIcons
                          name={fridge.isMain ? "star" : "star-outline"}
                          size={22}
                          color={fridge.isMain ? Colors.orange : Colors.subText}
                        />
                        <Text style={[styles.mainFridgeButtonText, fridge.isMain && styles.mainFridgeButtonTextActive]}>
                          {fridge.isMain ? "대표" : "대표 설정"}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.fridgeManageButton}
                        onPress={() => props.onManage(fridge)}
                        disabled={props.loading}
                        accessibilityRole="button"
                        accessibilityLabel={`${fridge.fridgeName} 설정`}
                      >
                        <MaterialCommunityIcons
                          name="cog-outline"
                          size={22}
                          color={Colors.subText}
                        />
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
              <View style={styles.sheetActions}>
                <SheetAction
                  icon="plus-circle-outline"
                  label="새 냉장고 만들기"
                  onPress={() => props.onModeChange("create")}
                />
                <SheetAction
                  icon="account-plus-outline"
                  label="초대 코드로 참여"
                  onPress={() => props.onModeChange("join")}
                />
                <SheetAction
                  icon="share-variant-outline"
                  label="현재 냉장고에 초대"
                  onPress={props.onInvite}
                />
                {props.removedFridges.length > 0 ? (
                  <View style={styles.removedFridgeSection}>
                    <Text style={styles.removedFridgeTitle}>
                      이 기기에서 제거한 냉장고
                    </Text>
                    {props.removedFridges.map((fridge) => (
                      <View key={fridge.fridgeId} style={styles.removedFridgeRow}>
                        <Text style={styles.removedFridgeName} numberOfLines={1}>
                          {fridge.fridgeName}
                        </Text>
                        <Pressable
                          style={styles.restoreFridgeButton}
                          onPress={() => props.onRestore(fridge.fridgeId)}
                          disabled={props.loading}
                        >
                          <Text style={styles.restoreFridgeButtonText}>복원</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </>
          ) : props.mode === "create" ? (
            <SheetForm
              value={props.fridgeName}
              placeholder="예: 우리집 냉장고"
              hint="구분하기 쉬운 이름을 입력해 주세요."
              buttonLabel="냉장고 만들기"
              loading={props.loading}
              error={props.error}
              onChangeText={props.onFridgeNameChange}
              onSubmit={props.onCreate}
            />
          ) : props.mode === "join" ? (
            <SheetForm
              value={props.inviteInput}
              placeholder="6자리 초대 코드"
              hint="냉장고 소유자에게 받은 코드를 입력해 주세요."
              buttonLabel="냉장고 참여하기"
              loading={props.loading}
              error={props.error}
              autoCapitalize="characters"
              onChangeText={props.onInviteInputChange}
              onSubmit={props.onJoin}
            />
          ) : props.mode === "invite" ? (
            <View style={styles.inviteContent}>
              {props.loading ? (
                <ActivityIndicator size="large" color={Colors.main} />
              ) : props.inviteCode ? (
                <>
                  <Text style={styles.inviteGuide}>
                    함께 사용할 사람에게 이 코드를 보내주세요.
                  </Text>
                  <Text style={styles.inviteCode} selectable>
                    {props.inviteCode}
                  </Text>
                  <Pressable style={styles.primaryButton} onPress={props.onShare}>
                    <MaterialCommunityIcons
                      name="share-variant"
                      size={20}
                      color={Colors.white}
                    />
                    <Text style={styles.primaryButtonText}>초대 코드 공유</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="account-lock-outline"
                    size={42}
                    color={Colors.coral}
                  />
                  <Text style={styles.formError}>
                    {props.error || "초대 코드를 만들지 못했습니다."}
                  </Text>
                  <Pressable style={styles.secondaryButton} onPress={props.onInvite}>
                    <Text style={styles.secondaryButtonText}>다시 시도</Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : managedFridge ? (
            <View style={styles.manageFridgeForm}>
              <View style={styles.manageFridgeSummary}>
                <View style={styles.manageFridgeIcon}>
                  <MaterialCommunityIcons
                    name="fridge-outline"
                    size={28}
                    color={Colors.mainDark}
                  />
                </View>
                <View style={styles.manageFridgeSummaryText}>
                  <Text style={styles.manageFridgeName} numberOfLines={1}>
                    {managedFridge.fridgeName}
                  </Text>
                  <Text style={styles.manageFridgeStatus}>
                    {managedFridge.isMain ? "현재 대표 냉장고" : "일반 냉장고"}
                  </Text>
                </View>
              </View>

              <Text style={styles.manageFieldLabel}>이 기기에서 표시할 이름</Text>
              <TextInput
                style={styles.sheetInput}
                value={props.managedFridgeName}
                onChangeText={props.onManagedFridgeNameChange}
                placeholder="냉장고 이름"
                placeholderTextColor={Colors.subText}
                maxLength={40}
              />
              <Text style={styles.formHint}>
                변경한 냉장고 이름은 이 기기에만 적용됩니다.
              </Text>
              {props.error ? <Text style={styles.formError}>{props.error}</Text> : null}
              <Pressable
                style={[
                  styles.primaryButton,
                  (!props.managedFridgeName.trim() || props.loading) &&
                    styles.disabledButton,
                ]}
                onPress={props.onRename}
                disabled={!props.managedFridgeName.trim() || props.loading}
              >
                {props.loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>이름 저장</Text>
                )}
              </Pressable>

              {!managedFridge.isMain ? (
                <Pressable
                  style={styles.manageSecondaryButton}
                  onPress={() => props.onSetMain(managedFridge.fridgeId)}
                  disabled={props.loading}
                >
                  <MaterialCommunityIcons
                    name="star-outline"
                    size={21}
                    color={Colors.orangeDark}
                  />
                  <Text style={styles.manageSecondaryButtonText}>
                    대표 냉장고로 설정
                  </Text>
                </Pressable>
              ) : null}

              <View style={styles.manageDangerZone}>
                <Text style={styles.manageDangerTitle}>목록에서 제거</Text>
                <Text style={styles.manageDangerDescription}>
                  서버의 냉장고나 재료는 삭제하지 않고 이 기기에서만 숨깁니다.
                </Text>
                <Pressable
                  style={[
                    styles.manageRemoveButton,
                    (props.loading || managedFridge.isMain) && styles.disabledButton,
                  ]}
                  onPress={() =>
                    props.onRemove(
                      managedFridge.fridgeId,
                      managedFridge.fridgeName,
                    )
                  }
                  disabled={props.loading || managedFridge.isMain}
                >
                  <MaterialCommunityIcons
                    name="eye-off-outline"
                    size={20}
                    color={Colors.coralDark}
                  />
                  <Text style={styles.manageRemoveButtonText}>
                    {managedFridge.isMain
                      ? "대표 변경 후 제거 가능"
                      : "이 기기 목록에서 제거"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.inviteContent}>
              <Text style={styles.formError}>
                설정할 냉장고를 찾지 못했습니다.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SheetAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.sheetAction} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={22} color={Colors.mainDark} />
      <Text style={styles.sheetActionText}>{label}</Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color={Colors.subText}
      />
    </Pressable>
  );
}

function SheetForm({
  value,
  placeholder,
  hint,
  buttonLabel,
  loading,
  error,
  autoCapitalize = "sentences",
  onChangeText,
  onSubmit,
}: {
  value: string;
  placeholder: string;
  hint: string;
  buttonLabel: string;
  loading: boolean;
  error: string | null;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  onChangeText: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.sheetForm}>
      <TextInput
        style={styles.sheetInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.subText}
        autoCapitalize={autoCapitalize}
        maxLength={40}
        autoFocus
      />
      <Text style={styles.formHint}>{hint}</Text>
      {error ? <Text style={styles.formError}>{error}</Text> : null}
      <Pressable
        style={[
          styles.primaryButton,
          (!value.trim() || loading) && styles.disabledButton,
        ]}
        disabled={!value.trim() || loading}
        onPress={onSubmit}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
        )}
      </Pressable>
    </View>
  );
}
