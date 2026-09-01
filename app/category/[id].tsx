/**
 * app/category/[id].tsx — متصفّح التصنيفات التدريجي (PART 36): مبيعرضش
 * الشجرة كلها مرة واحدة — بيوريك بس فروع التصنيف الحالي، ولو التصنيف
 * ورقة (leaf) بيودّي على طول لنتائج البحث مفلترة بيه.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getCategory, getChildren, getPath } from '@/mock/taxonomy/categories';
import { useTheme } from '@/theme/ThemeProvider';

export default function CategoryBrowser() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();

  const category = getCategory(id!);
  const children = getChildren(id!);
  const isLeaf = children.length === 0;

  useEffect(() => {
    if (category && isLeaf) {
      router.replace(`/results?category=${category.id}`);
    }
  }, [category, isLeaf, router]);

  if (!category) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <Text style={{ color: colors.ink3 }}>التصنيف مش موجود</Text>
      </View>
    );
  }

  if (isLeaf) return null; // هيتحول لنتائج البحث فورًا (useEffect فوق)

  const path = getPath(category.id);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title={category.name} onBack={() => router.back()} />
      {path.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5, paddingHorizontal: spacing.s5, paddingBottom: spacing.s3, alignItems: 'center' }}>
          {path.map((p, i) => (
            <React.Fragment key={p.id}>
              {i > 0 ? <Icon name="chev-l" size={11} color={colors.ink3} /> : null}
              <Pressable onPress={() => router.push(`/category/${p.id}`)}>
                <Text style={{ fontSize: 11.5, color: i === path.length - 1 ? colors.ink : colors.signal, fontWeight: '600' }}>{p.name}</Text>
              </Pressable>
            </React.Fragment>
          ))}
        </ScrollView>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingTop: 0, gap: spacing.s3 }}>
        {children.map((c) => {
          const grandChildren = getChildren(c.id);
          return (
            <Pressable
              key={c.id}
              onPress={() => router.push(grandChildren.length > 0 ? `/category/${c.id}` : `/results?category=${c.id}`)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3 }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={c.icon} color={colors.signal2} size={22} />
              </View>
              <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: colors.ink }}>{c.name}</Text>
              <Icon name="chev-l" size={16} color={colors.ink3} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
