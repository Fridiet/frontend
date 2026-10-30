import { View, Text, TextInput, Pressable } from 'react-native';
export type QuantityMetadataValue = { countBasis?: string | null; perCountQuantity?: number | null; perCountUnit?: string | null };
export function QuantityMetadataFields({ value, onChange }: { value: QuantityMetadataValue; onChange: (value: QuantityMetadataValue) => void }) {
  return <View style={{ gap: 8, marginVertical: 12 }}>
    <Text>개수 기준 (선택: 봉지, 병, 조각 등)</Text>
    <TextInput accessibilityLabel="개수 기준" style={{ borderWidth: 1, padding: 12, borderColor: '#ccc' }} value={value.countBasis ?? ''} onChangeText={(countBasis) => onChange({ ...value, countBasis })} placeholder="낱개 재료라면 비워두세요" />
    <Text>확인한 개당 무게/용량 (선택, 평균값 추정 금지)</Text>
    <TextInput accessibilityLabel="개당 용량" style={{ borderWidth: 1, padding: 12, borderColor: '#ccc' }} keyboardType="decimal-pad" defaultValue={value.perCountQuantity == null ? '' : String(value.perCountQuantity)}
      onChangeText={(text) => onChange({ ...value, perCountQuantity: text ? Number(text) : null, perCountUnit: text ? (value.perCountUnit ?? 'g') : null })} placeholder="예: 포장 표시에 500g이면 500" />
    <View style={{ flexDirection: 'row', gap: 12 }}>{['g', 'mL'].map((unit) => <Pressable key={unit} onPress={() => onChange({ ...value, perCountUnit: value.perCountQuantity == null ? null : unit })} style={{ padding: 12, backgroundColor: value.perCountUnit === unit ? '#cddbbb' : '#eee' }}><Text>{unit}</Text></Pressable>)}</View>
  </View>;
}
