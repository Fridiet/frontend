import { MaterialCommunityIcons } from "@expo/vector-icons";
import { nativeNotifications as Notifications } from "../utils/nativeNotifications";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SettingsScreenHeader from "../components/SettingsScreenHeader";
import { Colors } from "../constants/colors";
import { useSession } from "../hooks/useSession";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_SLOTS,
  loadNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
  type NotificationSlot,
} from "../utils/notificationPreferences";
import { getNotificationSettings, updateNotificationSettings } from "@/api/notificationApi";

type PermissionState = "granted" | "denied" | "undetermined" | "unavailable";

const SLOT_LABELS: Record<NotificationSlot, { label: string; description: string }> = {
  "09:00": { label: "오전 9시", description: "아침" },
  "13:00": { label: "오후 1시", description: "점심" },
  "19:00": { label: "오후 7시", description: "저녁" },
};

export default function NotificationSettingsScreen() {
  const session = useSession();
  const userId = session?.userId;
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryPreferences, setRetryPreferences] = useState<NotificationPreferences | null>(null);
  const [permission, setPermission] = useState<PermissionState>("unavailable");
  const [permissionBusy, setPermissionBusy] = useState(false);
  const savingRef = useRef(false);

  const readPermission = useCallback(async () => {
    if (Platform.OS === "web" || !Notifications) {
      setPermission("unavailable");
      return;
    }
    try {
      const result = await Notifications.getPermissionsAsync();
      setPermission(result.status);
    } catch {
      setPermission("unavailable");
    }
  }, []);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      setLoading(true);
      setError(null);
      if (!userId) {
        if (active) {
          setError("로그인 정보를 확인하지 못했어요. 다시 로그인해 주세요.");
          setLoading(false);
        }
        return;
      }
      try {
        const stored = await loadNotificationPreferences(userId);

        const serverData = await getNotificationSettings();

        const latesPreferences: NotificationPreferences = {
          ...stored,
          pushEnabled: serverData.pushEnabled ?? stored.pushEnabled,
          expiryEnabled: serverData.expiryEnabled ?? stored.expiryEnabled,
          fridgeActivityEnabled: serverData.fridgeActivityEnabled ?? stored.fridgeActivityEnabled,
          expirySlot: serverData.notificationTime ?? stored.expirySlot,
        };

        if (active) {
          setPreferences(stored);
          await saveNotificationPreferences(userId, latesPreferences);
          setLoading(false);
        } 
      } catch (error) {
        setError("알림 설정을 불러오는 데 실패했어요. 잠시 후 다시 시도해 주세요.");
        if (active) {
          const fallback = await loadNotificationPreferences(userId);
          setPreferences(fallback);
          setLoading(false);
        }
      }
    };
    void hydrate();
    void readPermission();
    return () => { active = false; };
  }, [readPermission, userId]);

  const commit = async (next: NotificationPreferences) => {
    if (!userId || savingRef.current) return;
    const previous = preferences;
    savingRef.current = true;
    setPreferences(next);
    setSaving(true);
    setError(null);
    setRetryPreferences(null);
    try {
      await saveNotificationPreferences(userId, next);
      await updateNotificationSettings({
        pushEnabled: next.pushEnabled,
        expiryEnabled: next.expiryEnabled,
        fridgeActivityEnabled: next.fridgeActivityEnabled,
        notificationTime: next.expirySlot,
      });
    } catch {
      setPreferences(previous);
      setRetryPreferences(next);
      setError("설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const update = (patch: Partial<NotificationPreferences>) => {
    void commit({ ...preferences, ...patch });
  };

  const handlePermissionAction = async () => {
    if (Platform.OS === "web" || !Notifications || permissionBusy) return;
    setPermissionBusy(true);
    try {
      if (permission === "undetermined") {
        const result = await Notifications.requestPermissionsAsync();
        setPermission(result.status);
      } else {
        await Linking.openSettings();
      }
    } finally {
      setPermissionBusy(false);
    }
  };

  const subordinateDisabled = loading || saving || !preferences.pushEnabled || !userId;
  const timeDisabled = subordinateDisabled || !preferences.expiryEnabled;
  const permissionCopy = permission === "granted"
    ? { title: "기기 알림이 허용되어 있어요", description: "Fridiet 알림을 이 기기에서 받을 수 있습니다.", icon: "bell-check-outline" as const }
    : permission === "denied"
      ? { title: "기기 알림이 꺼져 있어요", description: "알림을 받으려면 기기 설정에서 권한을 허용해 주세요.", icon: "bell-off-outline" as const }
      : permission === "undetermined"
        ? { title: "기기 알림 권한을 확인해 주세요", description: "알림을 받으려면 먼저 권한 허용이 필요합니다.", icon: "bell-alert-outline" as const }
        : { title: "모바일 앱에서 권한을 확인할 수 있어요", description: "현재 환경에서는 기기 알림 권한을 변경할 수 없습니다.", icon: "cellphone-information" as const };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SettingsScreenHeader title="알림 설정" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.notice}>
          <MaterialCommunityIcons name="information-outline" size={20} color={Colors.orangeDark} />
          <Text style={styles.noticeText}>
            선택한 설정은 이 기기에 저장됩니다. 서버 연동 전까지 실제 푸시 수신에는 반영되지 않을 수 있어요.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.mainStrong} />
            <Text style={styles.loadingText}>알림 설정을 불러오는 중이에요</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>푸시 알림</Text>
              <SettingSwitchRow
                icon="bell-outline"
                title="전체 푸시 알림"
                description="Fridiet에서 보내는 모든 푸시 알림"
                value={preferences.pushEnabled}
                disabled={saving || !userId}
                onValueChange={(value) => update({ pushEnabled: value })}
              />
              <View style={styles.divider} />
              <SettingSwitchRow
                icon="clock-alert-outline"
                title="임박재료"
                description="소비기한이 3일 이내로 남은 재료"
                value={preferences.expiryEnabled}
                disabled={subordinateDisabled}
                onValueChange={(value) => update({ expiryEnabled: value })}
              />
              <View style={styles.divider} />
              <SettingSwitchRow
                icon="fridge-outline"
                title="공유 냉장고 활동"
                description="다른 구성원이 재료를 추가한 소식"
                value={preferences.fridgeActivityEnabled}
                disabled={subordinateDisabled}
                onValueChange={(value) => update({ fridgeActivityEnabled: value })}
              />
            </View>

            <View style={[styles.section, timeDisabled && styles.sectionDisabled]}>
              <View style={styles.timeHeading}>
                <View>
                  <Text style={styles.sectionTitle}>임박재료 알림 시간</Text>
                  <Text style={styles.sectionDescription}>하루 한 번 받을 시간대를 선택해 주세요.</Text>
                </View>
                {saving ? <ActivityIndicator size="small" color={Colors.mainStrong} /> : null}
              </View>
              <View style={styles.slotRow}>
                {NOTIFICATION_SLOTS.map((slot) => {
                  const selected = preferences.expirySlot === slot;
                  return (
                    <Pressable
                      key={slot}
                      style={[styles.slot, selected && styles.slotSelected]}
                      disabled={timeDisabled}
                      onPress={() => update({ expirySlot: slot })}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected, disabled: timeDisabled }}
                      accessibilityLabel={`${SLOT_LABELS[slot].label} 알림`}
                    >
                      <Text style={[styles.slotDescription, selected && styles.slotDescriptionSelected]}>
                        {SLOT_LABELS[slot].description}
                      </Text>
                      <Text style={[styles.slotLabel, selected && styles.slotLabelSelected]}>
                        {SLOT_LABELS[slot].label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.permissionCard}>
              <View style={styles.permissionIcon}>
                <MaterialCommunityIcons name={permissionCopy.icon} size={23} color={Colors.mainStrong} />
              </View>
              <View style={styles.permissionCopy}>
                <Text style={styles.permissionTitle}>{permissionCopy.title}</Text>
                <Text style={styles.permissionDescription}>{permissionCopy.description}</Text>
              </View>
              {permission !== "granted" && permission !== "unavailable" ? (
                <Pressable
                  style={styles.permissionButton}
                  onPress={() => void handlePermissionAction()}
                  disabled={permissionBusy}
                  accessibilityRole="button"
                >
                  {permissionBusy
                    ? <ActivityIndicator size="small" color={Colors.mainStrong} />
                    : <Text style={styles.permissionButtonText}>{permission === "denied" ? "설정 열기" : "허용하기"}</Text>}
                </Pressable>
              ) : null}
            </View>
          </>
        )}

        {error ? (
          <Pressable
            style={styles.errorBox}
            onPress={() => retryPreferences && void commit(retryPreferences)}
            disabled={!retryPreferences}
            accessibilityRole="button"
            accessibilityLabel="알림 설정 저장 다시 시도"
          >
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={Colors.coralDark} />
            <Text style={styles.errorText}>{error}</Text>
            {retryPreferences ? <Text style={styles.retryText}>다시 시도</Text> : null}
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

type SettingSwitchRowProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  disabled: boolean;
  onValueChange: (value: boolean) => void;
};

function SettingSwitchRow({
  icon,
  title,
  description,
  value,
  disabled,
  onValueChange,
}: SettingSwitchRowProps) {
  return (
    <View style={[styles.settingRow, disabled && styles.rowDisabled]}>
      <View style={styles.settingIcon}>
        <MaterialCommunityIcons name={icon} size={22} color={Colors.mainStrong} />
      </View>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.line, true: Colors.main }}
        thumbColor={Colors.white}
        accessibilityLabel={title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  content: {
    width: "100%",
    maxWidth: 580,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.lightOrange,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19, color: Colors.orangeDark },
  loadingBox: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: Colors.subText },
  section: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 17,
    borderRadius: 16,
    backgroundColor: Colors.white,
  },
  sectionDisabled: { opacity: 0.5 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  sectionDescription: { marginTop: 5, fontSize: 12, lineHeight: 18, color: Colors.subText },
  settingRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12 },
  rowDisabled: { opacity: 0.48 },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.lightGreen,
  },
  settingCopy: { flex: 1, minWidth: 0 },
  settingTitle: { fontSize: 15, fontWeight: "700", color: Colors.text },
  settingDescription: { marginTop: 3, fontSize: 12, lineHeight: 17, color: Colors.subText },
  divider: { height: 1, marginLeft: 50, backgroundColor: Colors.line },
  timeHeading: { minHeight: 44, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  slotRow: { flexDirection: "row", gap: 8, marginTop: 15 },
  slot: {
    flex: 1,
    minHeight: 66,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 13,
    backgroundColor: Colors.softBackground,
  },
  slotSelected: { borderColor: Colors.mainStrong, backgroundColor: Colors.lightGreen },
  slotDescription: { fontSize: 11, fontWeight: "600", color: Colors.subText },
  slotDescriptionSelected: { color: Colors.mainDark },
  slotLabel: { marginTop: 4, fontSize: 14, fontWeight: "700", color: Colors.text },
  slotLabelSelected: { color: Colors.mainStrong },
  permissionCard: {
    minHeight: 86,
    marginTop: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 16,
    backgroundColor: Colors.white,
  },
  permissionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.lightGreen,
  },
  permissionCopy: { flex: 1, minWidth: 0 },
  permissionTitle: { fontSize: 14, fontWeight: "700", color: Colors.text },
  permissionDescription: { marginTop: 4, fontSize: 12, lineHeight: 17, color: Colors.subText },
  permissionButton: {
    minWidth: 68,
    minHeight: 40,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: Colors.lightGreen,
  },
  permissionButtonText: { fontSize: 12, fontWeight: "700", color: Colors.mainStrong },
  errorBox: {
    minHeight: 56,
    marginTop: 14,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: Colors.lightCoral,
  },
  errorText: { flex: 1, fontSize: 12, lineHeight: 18, color: Colors.coralDark },
  retryText: { fontSize: 12, fontWeight: "700", color: Colors.coralDark },
});
