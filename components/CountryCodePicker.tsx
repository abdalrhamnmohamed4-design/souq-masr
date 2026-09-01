/**
 * components/CountryCodePicker.tsx — شيت سفلي لاختيار كود الدولة وقت
 * تسجيل الدخول، بنفس نمط components/LocationPicker.tsx (بحث حي + قسم
 * "مقترحة" فوق) عشان يبقى نفس الإحساس. قائمة الدول والعلم المحسوب من
 * lib/countries.ts.
 */
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '@/i18n';
import { COUNTRIES, PINNED_ISO2, countryName, flagEmoji, searchCountries, type Country } from '@/lib/countries';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Icon';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: Country) => void;
  selectedIso2: string;
};

export function CountryCodePicker({ visible, onClose, onSelect, selectedIso2 }: Props) {
  const { colors, spacing, radius } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const pinned = useMemo(
    () => PINNED_ISO2.map((iso) => COUNTRIES.find((c) => c.iso2 === iso)).filter(Boolean) as Country[],
    [],
  );
  const results = query.trim() ? searchCountries(query) : COUNTRIES;

  const select = (c: Country) => {
    onSelect(c);
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,26,46,.55)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ backgroundColor: colors.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '86%', paddingBottom: insets.bottom }}
        >
          <View style={{ width: 38, height: 4, borderRadius: 999, backgroundColor: colors.line, alignSelf: 'center', marginTop: 12, marginBottom: 10 }} />

          <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 16, color: colors.ink, paddingHorizontal: spacing.s5, marginBottom: spacing.s3 }}>
            {t('auth.selectCountry')}
          </Text>

          <View style={{ paddingHorizontal: spacing.s5, marginBottom: spacing.s3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, paddingHorizontal: spacing.s3 }}>
              <Icon name="search" size={16} color={colors.ink3} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('auth.searchCountry')}
                placeholderTextColor={colors.ink3}
                style={{ flex: 1, fontSize: 12.5, color: colors.ink, paddingVertical: 11 }}
              />
              {query ? (
                <Pressable onPress={() => setQuery('')}>
                  <Icon name="x" size={14} color={colors.ink3} />
                </Pressable>
              ) : null}
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.s5, paddingBottom: 20 }}>
            {!query.trim() ? (
              <>
                <SectionLabel text={t('auth.suggested')} />
                {pinned.map((c) => (
                  <Row key={c.iso2} country={c} selected={c.iso2 === selectedIso2} onPress={() => select(c)} />
                ))}
                <SectionLabel text={t('auth.allCountries')} />
              </>
            ) : null}
            {results.length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.ink3, textAlign: 'center', paddingVertical: 30 }}>{t('auth.noResults')}</Text>
            ) : (
              results.map((c) => (
                <Row key={c.iso2} country={c} selected={c.iso2 === selectedIso2} onPress={() => select(c)} />
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SectionLabel({ text }: { text: string }) {
  const { colors, spacing } = useTheme();
  return (
    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.ink3, marginTop: spacing.s3, marginBottom: spacing.s2 }}>{text}</Text>
  );
}

function Row({ country, selected, onPress }: { country: Country; selected: boolean; onPress: () => void }) {
  const { colors, spacing } = useTheme();
  const language = useLanguageStore((s) => s.language);
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line2 }}
    >
      <Text style={{ fontSize: 20 }}>{flagEmoji(country.iso2)}</Text>
      <Text style={{ flex: 1, fontSize: 13, fontWeight: selected ? '700' : '500', color: selected ? colors.signal : colors.ink }}>
        {countryName(country, language)}
      </Text>
      <Text style={{ fontSize: 12, color: colors.ink3, fontFamily: 'Cairo_700Bold' }}>+{country.dial}</Text>
      {selected ? <Icon name="check" size={15} color={colors.signal} /> : null}
    </Pressable>
  );
}

export default CountryCodePicker;
