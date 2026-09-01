/**
 * components/primitives/FormField.tsx — يقابل .field (label + input/textarea
 * + hint + counter) و.priceinput (حقل سعر بلاحقة "ج.م").
 */
import React from 'react';
import { Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  showCounter?: boolean;
  isPrice?: boolean; // يضيف لاحقة "ج.م" ويكبّر الخط زي .priceinput
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
};

export function FormField({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  multiline,
  maxLength,
  showCounter,
  isPrice,
  keyboardType,
  editable = true,
}: Props) {
  const { colors, radius, type, spacing } = useTheme();

  return (
    <View style={{ marginBottom: spacing.s4 }}>
      <Text style={{ fontSize: type.cap, fontWeight: '700', color: colors.ink, marginBottom: 6 }}>
        {label}
        {hint ? <Text style={{ fontSize: 10, color: colors.ink3, fontWeight: '400' }}> {hint}</Text> : null}
      </Text>

      <View style={{ position: 'relative', justifyContent: 'center' }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.ink3}
          multiline={multiline}
          maxLength={maxLength}
          keyboardType={keyboardType}
          editable={editable}
          textAlign="right"
          style={{
            backgroundColor: editable ? colors.card : colors.line2,
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: radius.r2,
            paddingVertical: 13,
            paddingHorizontal: spacing.s3,
            paddingLeft: isPrice ? 52 : spacing.s3,
            fontSize: isPrice ? type.ti : type.sm,
            fontFamily: isPrice ? 'Cairo_800ExtraBold' : undefined,
            color: colors.ink,
            height: multiline ? 88 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
        />
        {isPrice ? (
          <Text
            style={{
              position: 'absolute',
              left: spacing.s3,
              fontSize: type.cap,
              color: colors.ink3,
              fontWeight: '700',
            }}
          >
            ج.م
          </Text>
        ) : null}
      </View>

      {showCounter && maxLength ? (
        <Text style={{ textAlign: 'left', fontSize: 9.5, color: colors.ink3, marginTop: 4 }}>
          {value.length} / {maxLength}
        </Text>
      ) : null}
    </View>
  );
}

export default FormField;
