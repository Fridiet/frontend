import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, router } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createMealRecord, deleteMealRecord, getMealHistory, updateMealRecord, uploadMealImage, type MealImageAsset, type MealRecordResponse, type MealType } from "../../api/calendarApi";
import { getInventories } from "../../api/inventoryApi";
import { Colors } from "../../constants/colors";
import { useFridge } from "../../contexts/FridgeContext";
import { calendarStyles as styles } from "../../styles/featureStyles";
import type { InventoryItem } from "../../types/fridge";
import { getActivityTrackingStartedAt, getInventoryActivities, type InventoryActivity } from "../../utils/activityLedger";
import { getApiErrorMessage } from "../../utils/apiError";
import { getTokenUserId } from "../../utils/token";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: "BREAKFAST", label: "아침" },
  { key: "LUNCH", label: "점심" },
  { key: "DINNER", label: "저녁" },
  { key: "SNACK", label: "간식" },
];

type UsedIngredientDraft = { batchId: number; value: string };
type MealImageDraft = MealImageAsset & { fileSize: number | null };

const MAX_MEAL_IMAGE_BYTES = 10 * 1024 * 1024;

function dateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKey(value: string) {
  return value.slice(0, 7);
}

function monthLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function mealTypeLabel(type: MealType) {
  return MEAL_TYPES.find((item) => item.key === type)?.label ?? type;
}

function buildCalendarDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: lastDay }, (_, index) => index + 1),
  ];
}

export default function CalendarScreen() {
  const { currentFridge } = useFridge();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [meals, setMeals] = useState<MealRecordResponse[]>([]);
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [activities, setActivities] = useState<InventoryActivity[]>([]);
  const [trackingStartedAt, setTrackingStartedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [mealModalVisible, setMealModalVisible] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealRecordResponse | null>(null);
  const [actionMeal, setActionMeal] = useState<MealRecordResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const mealRequestId = useRef<string | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [mealType, setMealType] = useState<MealType>("DINNER");
  const [usedIngredients, setUsedIngredients] = useState<UsedIngredientDraft[]>([]);
  const [selectedImage, setSelectedImage] = useState<MealImageDraft | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageFailed, setPreviewImageFailed] = useState(false);
  const [failedImageUrls, setFailedImageUrls] = useState<string[]>([]);
  const [pickingImage, setPickingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStage, setSaveStage] = useState<"uploading" | "saving" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async (showSpinner = true) => {
    if (!currentFridge) {
      setMeals([]);
      setInventories([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const tokenUserId = await getTokenUserId();
      if (tokenUserId === null) {
        throw new Error("로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.");
      }
      const [mealResult, inventoryResult, activityResult, startedAt] = await Promise.all([
        getMealHistory(tokenUserId),
        getInventories(currentFridge.fridgeId),
        getInventoryActivities(currentFridge.fridgeId),
        getActivityTrackingStartedAt(),
      ]);
      setMeals(mealResult.filter((meal) => meal.fridgeId === currentFridge.fridgeId));
      setInventories(inventoryResult);
      setActivities(activityResult);
      setTrackingStartedAt(startedAt);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "식사 기록을 불러오지 못했어요."));
    } finally {
      if (showSpinner) setLoading(false);
      setRefreshing(false);
    }
  }, [currentFridge]);

  useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));

  const visibleMonthKey = `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, "0")}`;
  const monthMeals = useMemo(() => meals.filter((meal) => monthKey(meal.eatenAt) === visibleMonthKey), [meals, visibleMonthKey]);
  const selectedMeals = useMemo(() => meals.filter((meal) => dateKey(meal.eatenAt) === selectedDate), [meals, selectedDate]);
  const monthActivities = useMemo(() => activities.filter((activity) => monthKey(activity.occurredAt) === visibleMonthKey), [activities, visibleMonthKey]);
  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

  const report = useMemo(() => {
    const typeCounts = Object.fromEntries(MEAL_TYPES.map((item) => [item.key, 0])) as Record<MealType, number>;
    const menuCounts = new Map<string, number>();
    monthMeals.forEach((meal) => {
      typeCounts[meal.mealType] += 1;
      menuCounts.set(meal.title, (menuCounts.get(meal.title) ?? 0) + 1);
    });
    const topMenus = [...menuCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const usage = new Map<string, { quantity: number; unit: string }>();
    monthMeals.flatMap((meal) => meal.consumedItems).forEach((item) => {
      const key = `${item.ingredientName}|${item.unit ?? ""}`;
      const current = usage.get(key) ?? { quantity: 0, unit: item.unit ?? "" };
      current.quantity += item.quantityUsed ?? 0;
      usage.set(key, current);
    });
    monthActivities.filter((activity) => activity.type === "QR_USE" && activity.quantity !== null).forEach((activity) => {
      const key = `${activity.ingredientName}|${activity.unit ?? ""}`;
      const current = usage.get(key) ?? { quantity: 0, unit: activity.unit ?? "" };
      current.quantity += activity.quantity ?? 0;
      usage.set(key, current);
    });
    return {
      typeCounts,
      topMenus,
      usage: [...usage.entries()].map(([key, value]) => ({ name: key.split("|")[0], ...value })).sort((a, b) => b.quantity - a.quantity).slice(0, 5),
      consumed: monthActivities.filter((activity) => activity.type === "CONSUMED").length,
      discarded: monthActivities.filter((activity) => activity.type === "DISCARDED").length,
      qrUses: monthActivities.filter((activity) => activity.type === "QR_USE").length,
    };
  }, [monthActivities, monthMeals]);

  const changeMonth = (offset: number) => {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    setVisibleMonth(next);
    setSelectedDate(dateKey(next));
    setShowReport(false);
  };

  const openMealModal = () => {
    setEditingMeal(null);
    mealRequestId.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setTitle("");
    setNote("");
    setMealType("DINNER");
    setUsedIngredients([]);
    setSelectedImage(null);
    setUploadedImageUrl(null);
    setFormError(null);
    setMealModalVisible(true);
  };

  const openEditMeal = (meal: MealRecordResponse) => {
    setEditingMeal(meal);
    setTitle(meal.title);
    setNote(meal.note ?? "");
    setMealType(meal.mealType);
    setSelectedDate(dateKey(meal.eatenAt));
    setUsedIngredients(meal.consumedItems.map((item) => ({ batchId: item.batchId, value: item.customText ?? String(item.quantityUsed ?? "") })));
    setSelectedImage(null);
    setUploadedImageUrl(meal.imageUrl);
    setFormError(null);
    setActionMeal(null);
    setMealModalVisible(true);
  };

  const openImagePreview = (imageUrl: string) => {
    setPreviewImageFailed(false);
    setPreviewImageUrl(imageUrl);
  };

  const pickMealImage = async (source: "camera" | "library") => {
    if (saving || pickingImage) return;
    setPickingImage(true);
    setFormError(null);

    try {
      const permission = source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error(source === "camera"
          ? "식사 사진을 촬영하려면 카메라 권한을 허용해 주세요."
          : "식사 사진을 선택하려면 사진 접근 권한을 허용해 주세요.");
      }

      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            cameraType: ImagePicker.CameraType.back,
            quality: 0.85,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsMultipleSelection: false,
            quality: 0.85,
          });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_MEAL_IMAGE_BYTES) {
        throw new Error("식사 사진은 10MB 이하로 선택해 주세요.");
      }

      setSelectedImage({
        uri: asset.uri,
        fileName: asset.fileName || `meal-${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
        fileSize: asset.fileSize ?? null,
      });
      setUploadedImageUrl(null);
    } catch (imageError) {
      setFormError(getApiErrorMessage(imageError, "식사 사진을 불러오지 못했어요."));
    } finally {
      setPickingImage(false);
    }
  };

  const removeMealImage = () => {
    if (saving) return;
    setSelectedImage(null);
    setUploadedImageUrl(null);
    setFormError(null);
  };

  const toggleIngredient = (item: InventoryItem) => {
    setUsedIngredients((current) => current.some((draft) => draft.batchId === item.batchId)
      ? current.filter((draft) => draft.batchId !== item.batchId)
      : [...current, { batchId: item.batchId, value: item.unitType === "CUSTOM" ? item.customQuantityText ?? "" : "" }]);
  };

  const updateIngredientValue = (batchId: number, value: string) => {
    setUsedIngredients((current) => current.map((draft) => draft.batchId === batchId ? { ...draft, value } : draft));
  };

  const saveMeal = async () => {
    if (!currentFridge || saving) return;
    if (!title.trim()) { setFormError("먹은 메뉴를 입력해 주세요."); return; }
    const invalid = usedIngredients.some((draft) => {
      const item = inventories.find((inventory) => inventory.batchId === draft.batchId);
      const previous = editingMeal?.consumedItems.find((consumed) => consumed.batchId === draft.batchId);
      const unitType = item?.unitType ?? previous?.unitType ?? "QUANTITY";
      if ((!item && !previous) || !draft.value.trim()) return true;
      return unitType !== "CUSTOM" && (!Number.isFinite(Number(draft.value)) || Number(draft.value) <= 0 || Number(draft.value) > ((item?.remainingQuantity ?? 0) + (previous?.quantityUsed ?? 0)));
    });
    if (invalid) { setFormError("선택한 재료의 사용량을 올바르게 입력해 주세요."); return; }

    setSaving(true);
    setFormError(null);
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;
    try {
      let imageUrl = uploadedImageUrl;
      if (selectedImage && !imageUrl) {
        setSaveStage("uploading");
        imageUrl = await uploadMealImage(selectedImage);
        setUploadedImageUrl(imageUrl);
      }
      setSaveStage("saving");
      const payloadBase = {
        requestId: mealRequestId.current,
        title: title.trim(),
        mealType,
        note: note.trim() || undefined,
        eatenAt: editingMeal?.eatenAt ?? `${selectedDate}T${time}`,
        usedIngredients: usedIngredients.map((draft) => {
          const item = inventories.find((inventory) => inventory.batchId === draft.batchId)!;
          const previous = editingMeal?.consumedItems.find((consumed) => consumed.batchId === draft.batchId);
          const unitType = item?.unitType ?? previous?.unitType ?? "QUANTITY";
          return unitType === "CUSTOM"
            ? { batchId: draft.batchId, unitType, customText: draft.value.trim() }
            : { batchId: draft.batchId, unitType, quantityUsed: Number(draft.value), unit: item?.unit ?? previous?.unit ?? undefined };
        }),
      };
      if (editingMeal) {
        await updateMealRecord(editingMeal.mealEventId, { ...payloadBase, imageUrl: imageUrl || null });
      } else {
        await createMealRecord({ fridgeId: currentFridge.fridgeId, ...payloadBase, imageUrl: imageUrl || undefined });
      }
      setSelectedImage(null);
      setUploadedImageUrl(null);
      setMealModalVisible(false);
      await loadData(false);
    } catch (saveError) {
      setFormError(getApiErrorMessage(saveError, "식사를 기록하지 못했어요. 재고 수량을 확인해 주세요."));
    } finally {
      setSaving(false);
      setSaveStage(null);
    }
  };

  const executeDeleteMeal = async (meal: MealRecordResponse) => {
    if (deleting) return;
    setDeleting(true); setActionError(null);
    try {
      await deleteMealRecord(meal.mealEventId);
      setMeals((current) => current.filter((item) => item.mealEventId !== meal.mealEventId));
      setActionMeal(null);
      await loadData(false);
    } catch (deleteError) { setActionError(getApiErrorMessage(deleteError, "식사 기록을 삭제하지 못했어요.")); }
    finally { setDeleting(false); }
  };

  const confirmDeleteMeal = (meal: MealRecordResponse) => {
    if (Platform.OS === "web") { if (window.confirm("이 식사 기록을 삭제할까요? 재고도 서버 규칙에 따라 함께 조정됩니다.")) void executeDeleteMeal(meal); return; }
    Alert.alert("식사 기록 삭제", "재고도 서버 규칙에 따라 함께 조정됩니다.", [{ text: "취소", style: "cancel" }, { text: "삭제", style: "destructive", onPress: () => void executeDeleteMeal(meal) }]);
  };

  if (!currentFridge) return <SafeAreaView style={styles.safeArea}><View style={styles.centerState}><Text style={styles.stateTitle}>선택된 냉장고가 없어요</Text><Text style={styles.stateText}>냉장고를 선택하면 식사 기록을 볼 수 있어요.</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadData(false);
            }}
            tintColor={Colors.main}
            colors={[Colors.main]}
          />
        }
      >
        <View style={styles.pageHeader}><View><Text style={styles.pageTitle}>식단 캘린더</Text><Text style={styles.pageSubtitle}>{currentFridge.fridgeName}에서 먹은 식사를 기록해요.</Text></View><Pressable style={styles.addMealButton} onPress={openMealModal} accessibilityLabel="식사 기록 추가"><MaterialCommunityIcons name="plus" size={24} color={Colors.white} /></Pressable></View>
        <Pressable style={styles.reportBanner} onPress={() => setShowReport((current) => !current)} accessibilityRole="button"><View><Text style={styles.reportBannerTitle}>{monthLabel(visibleMonth)} 결산</Text><Text style={styles.reportBannerText}>{monthMeals.length > 0 ? `내 식사 ${monthMeals.length}번 · 재료 사용 ${report.usage.length}종` : "이번 달 첫 식사를 기록해 보세요."}</Text></View><MaterialCommunityIcons name={showReport ? "chevron-up" : "chevron-right"} size={24} color={Colors.mainStrong} /></Pressable>

        {showReport ? <View style={styles.reportSection}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/monthly-report')}><Text style={styles.textAction}>서버 기준 소비·폐기 결산 보기 ›</Text></Pressable>
          <Text style={styles.sectionTitle}>나의 식사</Text>
          <View style={styles.metricRow}>{MEAL_TYPES.map((item) => <View key={item.key} style={styles.metricItem}><Text style={styles.metricValue}>{report.typeCounts[item.key]}</Text><Text style={styles.metricLabel}>{item.label}</Text></View>)}</View>
          <Text style={styles.reportLabel}>자주 먹은 메뉴</Text>{report.topMenus.length > 0 ? report.topMenus.map(([name, count]) => <View key={name} style={styles.reportRow}><Text style={styles.reportRowName}>{name}</Text><Text style={styles.reportRowValue}>{count}회</Text></View>) : <Text style={styles.emptyText}>아직 기록된 메뉴가 없어요.</Text>}
          <Text style={styles.reportLabel}>내가 사용한 냉장고 재료</Text>{report.usage.length > 0 ? report.usage.map((item) => <View key={`${item.name}-${item.unit}`} style={styles.reportRow}><Text style={styles.reportRowName}>{item.name}</Text><Text style={styles.reportRowValue}>{item.quantity}{item.unit}</Text></View>) : <Text style={styles.emptyText}>집계할 사용량이 없어요.</Text>}
          <View style={styles.localStats}><View><Text style={styles.localStatValue}>{report.qrUses}</Text><Text style={styles.localStatLabel}>QR 사용</Text></View><View><Text style={styles.localStatValue}>{report.consumed}</Text><Text style={styles.localStatLabel}>다 먹음</Text></View><View><Text style={styles.localStatValue}>{report.discarded}</Text><Text style={styles.localStatLabel}>폐기</Text></View></View>
          <Text style={styles.localNotice}>QR 사용·소진·폐기는 이 기기에서 {trackingStartedAt ? `${dateKey(trackingStartedAt)}부터 ` : ""}기록된 내역입니다.</Text>
        </View> : null}

        <View style={styles.monthHeader}><Pressable style={styles.monthButton} onPress={() => changeMonth(-1)} accessibilityLabel="이전 달"><MaterialCommunityIcons name="chevron-left" size={25} color={Colors.text} /></Pressable><Text style={styles.monthTitle}>{monthLabel(visibleMonth)}</Text><Pressable style={styles.monthButton} onPress={() => changeMonth(1)} accessibilityLabel="다음 달"><MaterialCommunityIcons name="chevron-right" size={25} color={Colors.text} /></Pressable></View>
        {error ? <Pressable style={styles.errorBox} onPress={() => void loadData()}><Text style={styles.errorText}>{error} 눌러서 다시 시도해 주세요.</Text></Pressable> : null}
        <View style={styles.calendarCard}>
          <View style={styles.weekRow}>{WEEKDAYS.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}</View>
          {loading ? <View style={styles.calendarLoading}><ActivityIndicator color={Colors.main} /></View> : <View style={styles.daysGrid}>{days.map((day, index) => {
            if (day === null) return <View key={`empty-${index}`} style={styles.dayCell} />;
            const key = `${visibleMonthKey}-${String(day).padStart(2, "0")}`;
            const count = meals.filter((meal) => dateKey(meal.eatenAt) === key).length;
            const selected = selectedDate === key;
            return <Pressable key={key} style={[styles.dayCell, selected && styles.dayCellSelected]} onPress={() => setSelectedDate(key)}><Text style={[styles.dayNumber, selected && styles.dayNumberSelected]}>{day}</Text>{count > 0 ? <View style={styles.mealDotRow}>{Array.from({ length: Math.min(count, 3) }, (_, dot) => <View key={dot} style={[styles.mealDot, selected && styles.mealDotSelected]} />)}</View> : null}</Pressable>;
          })}</View>}
        </View>

        <View style={styles.daySection}>
          <View style={styles.dayHeading}><Text style={styles.sectionTitle}>{selectedDate.replaceAll("-", ".")} 식사</Text><Pressable onPress={openMealModal}><Text style={styles.textAction}>기록 추가</Text></Pressable></View>
          {selectedMeals.length > 0 ? selectedMeals.map((meal) => (
            <View key={meal.mealEventId} style={styles.mealRow}>
              <View style={styles.mealTypeBadge}><Text style={styles.mealTypeText}>{mealTypeLabel(meal.mealType)}</Text></View>
              <View style={styles.mealCopy}>
                <Text style={styles.mealTitle}>{meal.title}</Text>
                <Text style={styles.mealDescription}>
                  {meal.consumedItems.length > 0 
                  ? meal.consumedItems.map((item) => 
                  item.unitType === "CUSTOM"
                  ? `${item.ingredientName}`
                  : `${item.ingredientName} ${item.quantityUsed ?? ""}${item.unit ?? ""}`)
                  .join(" · ") : "사용한 재료 없음"}
                </Text>
              </View>
              {meal.imageUrl ? (
                <Pressable style={styles.mealThumbnailButton} onPress={() => openImagePreview(meal.imageUrl!)} accessibilityRole="button" accessibilityLabel={`${meal.title} 식사 사진 크게 보기`}>
                  {failedImageUrls.includes(meal.imageUrl) ? (
                    <View style={styles.mealThumbnailFallback}><MaterialCommunityIcons name="image-off-outline" size={22} color={Colors.subText} /></View>
                  ) : (
                    <Image source={{ uri: meal.imageUrl }} style={styles.mealThumbnail} contentFit="cover" transition={150} onError={() => setFailedImageUrls((current) => current.includes(meal.imageUrl!) ? current : [...current, meal.imageUrl!])} />
                  )}
                </Pressable>
              ) : null}
              <Pressable style={styles.mealActionButton} onPress={() => { setActionError(null); setActionMeal(meal); }} accessibilityLabel={`${meal.title} 수정 또는 삭제`}><MaterialCommunityIcons name="dots-vertical" size={23} color={Colors.subText} /></Pressable>
            </View>
          )) : <View style={styles.dayEmpty}><MaterialCommunityIcons name="silverware-fork-knife" size={27} color={Colors.line} /><Text style={styles.emptyText}>이날 기록한 식사가 없어요.</Text></View>}
        </View>
      </ScrollView>

      <Modal visible={mealModalVisible} animationType="slide" transparent onRequestClose={() => !saving && setMealModalVisible(false)}>
        <View style={styles.modalRoot}><Pressable style={styles.modalBackdrop} onPress={() => !saving && setMealModalVisible(false)} /><View style={styles.sheet}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><View><Text style={styles.sheetTitle}>{editingMeal ? "식사 기록 수정" : "식사 기록"}</Text><Text style={styles.sheetSubtitle}>{selectedDate.replaceAll("-", ".")}</Text></View><Pressable style={styles.closeButton} onPress={() => setMealModalVisible(false)} disabled={saving}><MaterialCommunityIcons name="close" size={24} color={Colors.text} /></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
          {formError ? <View style={styles.errorBox}><Text style={styles.errorText}>{formError}</Text></View> : null}
          <Text style={styles.inputLabel}>끼니</Text><View style={styles.choiceRow}>{MEAL_TYPES.map((item) => <Pressable key={item.key} style={[styles.choice, mealType === item.key && styles.choiceSelected]} onPress={() => setMealType(item.key)}><Text style={[styles.choiceText, mealType === item.key && styles.choiceTextSelected]}>{item.label}</Text></Pressable>)}</View>
          <Text style={styles.inputLabel}>먹은 메뉴</Text><TextInput style={styles.textInput} value={title} onChangeText={setTitle} placeholder="예: 대파 계란볶음" placeholderTextColor={Colors.subText} maxLength={100} />
          <Text style={styles.inputLabel}>메모</Text><TextInput style={[styles.textInput, styles.noteInput]} value={note} onChangeText={setNote} placeholder="선택 사항" placeholderTextColor={Colors.subText} multiline maxLength={300} />
          <Text style={styles.inputLabel}>식사 사진 (선택)</Text>
          {selectedImage ? (
            <View style={styles.selectedPhotoWrap}>
              <Image source={{ uri: selectedImage.uri }} style={styles.selectedPhoto} contentFit="cover" transition={150} accessibilityLabel="선택한 식사 사진 미리보기" onError={() => setFormError("선택한 식사 사진을 표시하지 못했어요. 다른 사진을 선택해 주세요.")} />
              <View style={styles.selectedPhotoFooter}>
                <View style={styles.selectedPhotoCopy}><MaterialCommunityIcons name="check-circle" size={18} color={Colors.mainStrong} /><Text style={styles.selectedPhotoText} numberOfLines={1}>{selectedImage.fileName}</Text></View>
                <Pressable style={styles.removePhotoButton} onPress={removeMealImage} disabled={saving} accessibilityRole="button" accessibilityLabel="선택한 식사 사진 삭제"><MaterialCommunityIcons name="delete-outline" size={20} color={Colors.coralDark} /><Text style={styles.removePhotoText}>삭제</Text></Pressable>
              </View>
            </View>
          ) : uploadedImageUrl ? (
            <View style={styles.selectedPhotoWrap}><Image source={{ uri: uploadedImageUrl }} style={styles.selectedPhoto} contentFit="cover" /><View style={styles.selectedPhotoFooter}><Text style={styles.selectedPhotoText}>현재 식사 사진</Text><Pressable style={styles.removePhotoButton} onPress={removeMealImage} disabled={saving}><Text style={styles.removePhotoText}>삭제</Text></Pressable></View></View>
          ) : (
            <View style={styles.photoPickerRow}>
              <Pressable style={[styles.photoPickerButton, (saving || pickingImage) && styles.disabled]} onPress={() => void pickMealImage("camera")} disabled={saving || pickingImage} accessibilityRole="button" accessibilityLabel="식사 사진 촬영"><MaterialCommunityIcons name="camera-outline" size={22} color={Colors.mainStrong} /><Text style={styles.photoPickerText}>사진 촬영</Text></Pressable>
              <Pressable style={[styles.photoPickerButton, (saving || pickingImage) && styles.disabled]} onPress={() => void pickMealImage("library")} disabled={saving || pickingImage} accessibilityRole="button" accessibilityLabel="앨범에서 식사 사진 선택"><MaterialCommunityIcons name="image-multiple-outline" size={22} color={Colors.mainStrong} /><Text style={styles.photoPickerText}>앨범에서 선택</Text></Pressable>
            </View>
          )}
          {pickingImage ? <View style={styles.photoLoadingRow}><ActivityIndicator size="small" color={Colors.main} /><Text style={styles.photoLoadingText}>사진을 불러오고 있어요.</Text></View> : null}
          <Text style={styles.inputLabel}>사용한 재료 (선택)</Text>{inventories.length > 0 ? inventories.map((item) => { const draft = usedIngredients.find((entry) => entry.batchId === item.batchId); return <View key={item.batchId} style={styles.inventoryDraft}><Pressable style={styles.inventorySelect} onPress={() => toggleIngredient(item)}><MaterialCommunityIcons name={draft ? "checkbox-marked" : "checkbox-blank-outline"} size={23} color={draft ? Colors.mainStrong : Colors.subText} /><View style={styles.inventoryCopy}><Text style={styles.inventoryName}>{item.ingredientName}</Text><Text style={styles.inventoryMeta}>{item.unitType === "CUSTOM" ? item.customQuantityText : `${item.remainingQuantity ?? "-"}${item.unit ?? ""}`} 남음</Text></View></Pressable>{draft ? <TextInput style={styles.amountInput} value={draft.value} onChangeText={(value) => updateIngredientValue(item.batchId, value)} placeholder={item.unitType === "CUSTOM" ? "사용 후 상태" : `사용량 ${item.unit ?? ""}`} placeholderTextColor={Colors.subText} keyboardType={item.unitType === "CUSTOM" ? "default" : "decimal-pad"} /> : null}</View>; }) : <Text style={styles.emptyText}>사용할 재료를 선택하지 않고도 기록할 수 있어요.</Text>}
          <Pressable style={[styles.saveButton, (saving || !title.trim()) && styles.disabled]} onPress={() => void saveMeal()} disabled={saving || !title.trim()}>{saving ? <View style={styles.savingRow}><ActivityIndicator color={Colors.white} /><Text style={styles.saveButtonText}>{saveStage === "uploading" ? "사진 업로드 중" : "식사 기록 저장 중"}</Text></View> : <Text style={styles.saveButtonText}>{editingMeal ? "수정 저장" : "식사 기록 저장"}</Text>}</Pressable>
        </ScrollView></View></View>
      </Modal>

      <Modal visible={actionMeal !== null} animationType="fade" transparent onRequestClose={() => setActionMeal(null)}>
        <View style={styles.modalRoot}><Pressable style={styles.modalBackdrop} onPress={() => setActionMeal(null)} /><View style={styles.actionSheet}><View style={styles.sheetHandle} /><Text style={styles.actionTitle}>{actionMeal?.title}</Text>{actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}<Pressable style={styles.actionRow} onPress={() => actionMeal && openEditMeal(actionMeal)}><MaterialCommunityIcons name="pencil-outline" size={22} color={Colors.mainStrong} /><Text style={styles.actionRowText}>수정 화면 열기</Text></Pressable><Pressable style={styles.actionRow} onPress={() => actionMeal && confirmDeleteMeal(actionMeal)} disabled={deleting}>{deleting ? <ActivityIndicator color={Colors.coralDark} /> : <MaterialCommunityIcons name="delete-outline" size={22} color={Colors.coralDark} />}<Text style={[styles.actionRowText, { color: Colors.coralDark }]}>삭제</Text></Pressable><Pressable style={styles.cancelAction} onPress={() => setActionMeal(null)}><Text style={styles.cancelActionText}>닫기</Text></Pressable></View></View>
      </Modal>

      <Modal visible={previewImageUrl !== null} animationType="fade" transparent statusBarTranslucent onRequestClose={() => setPreviewImageUrl(null)}>
        <View style={styles.imagePreviewRoot}>
          <Pressable style={styles.imagePreviewBackdrop} onPress={() => setPreviewImageUrl(null)} accessibilityRole="button" accessibilityLabel="사진 확대 보기 닫기" />
          <View style={styles.imagePreviewHeader}><Text style={styles.imagePreviewTitle}>식사 사진</Text><Pressable style={styles.imagePreviewClose} onPress={() => setPreviewImageUrl(null)} accessibilityRole="button" accessibilityLabel="사진 확대 보기 닫기"><MaterialCommunityIcons name="close" size={26} color={Colors.white} /></Pressable></View>
          <View style={styles.imagePreviewContent} pointerEvents="none">
            {previewImageUrl && !previewImageFailed ? <Image source={{ uri: previewImageUrl }} style={styles.imagePreview} contentFit="contain" transition={150} onError={() => setPreviewImageFailed(true)} /> : <View style={styles.imagePreviewError}><MaterialCommunityIcons name="image-off-outline" size={42} color={Colors.white} /><Text style={styles.imagePreviewErrorText}>사진을 불러오지 못했어요.</Text></View>}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
