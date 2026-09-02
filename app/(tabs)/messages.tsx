/**
 * app/(tabs)/messages.tsx — يقابل #msgs: قائمة محادثات.
 *
 * Phase 2B Slice 4: بتدمج المحادثات الحقيقية (souq_masr.api.v1.chat.
 * get_my_conversations، CONV-#####) مع المحادثات المحلية (mock) في نفس
 * القائمة — نفس نمط app/(tabs)/myads.tsx's DisplayAd بالظبط: مصدرين،
 * صف عرض مختلف لكل واحد، بحث موحّد فوق الاتنين.
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { Avatar } from '@/components/primitives/Avatar';
import { ThumbPlaceholder } from '@/components/primitives/ThumbPlaceholder';
import { EmptyState } from '@/components/primitives/EmptyState';
import { IconButton } from '@/components/primitives/IconButton';
import { matchesQuery } from '@/lib/search';
import { useFabScrollHandler } from '@/lib/scrollFab';
import { useAllListings, useAppStore, useListingById, useSeller, type Conversation } from '@/store/useAppStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { getMyConversations, type RealConversationMeta } from '@/services/chatService';
import { useTheme } from '@/theme/ThemeProvider';

const REAL_CONVERSATIONS_POLL_MS = 5000;

function formatListTime(iso: string | null, language: 'ar' | 'en'): string {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (dOnly.getTime() === today.getTime()) {
    return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'ar-EG', { hour: 'numeric', minute: '2-digit' }).format(d);
  }
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dOnly.getTime() === yesterday.getTime()) return language === 'en' ? 'Yesterday' : 'أمس';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'ar-EG', { day: 'numeric', month: 'short' }).format(d);
}

export default function Messages() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const language = useLanguageStore((s) => s.language);
  const conversations = useAppStore((s) => s.conversations);
  const allListings = useAllListings();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const fabScrollHandler = useFabScrollHandler();

  const [realConversations, setRealConversations] = useState<RealConversationMeta[]>([]);
  const [realLoaded, setRealLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const r = await getMyConversations();
      if (cancelled) return;
      if (r.status === 'success') {
        setRealConversations(r.data.slice().sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '')));
      }
      setRealLoaded(true);
    };
    load();
    const timer = setInterval(load, REAL_CONVERSATIONS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تشوف رسائلك', description: 'المحادثات مع البائعين هتظهر هنا بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  const visibleReal = query.trim()
    ? realConversations.filter((c) => matchesQuery(c.lastMessagePreview, query) || (c.listing ? matchesQuery(c.listing.title, query) : false) || matchesQuery(c.otherParty.name, query))
    : realConversations;

  const visibleMock = query.trim()
    ? conversations.filter((c) => {
        const listing = allListings.find((l) => l.id === c.listingId);
        return matchesQuery(c.lastMessage, query) || (listing ? matchesQuery(listing.title, query) : false);
      })
    : conversations;

  const totalCount = conversations.length + realConversations.length;
  const visibleCount = visibleMock.length + visibleReal.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader
        title="الرسائل"
        showBack={false}
        right={
          <IconButton onPress={() => setSearchOpen((v) => !v)}>
            <Icon name={searchOpen ? 'x' : 'search'} color={colors.ink} />
          </IconButton>
        }
      />
      {searchOpen ? (
        <View style={{ paddingHorizontal: spacing.s5, paddingBottom: spacing.s3 }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="دوّر في المحادثات..."
            placeholderTextColor={colors.ink3}
            autoFocus
            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, paddingVertical: 11, paddingHorizontal: spacing.s3, fontSize: 12.5, color: colors.ink }}
          />
        </View>
      ) : null}
      {realLoaded && totalCount === 0 ? (
        <EmptyState
          icon={<Icon name="chat" color={colors.ink3} size={26} />}
          title="لسه مفيش رسائل"
          description="لما تراسل بائع من صفحة أي إعلان، المحادثة هتظهر هنا."
          actionLabel="استكشف الإعلانات"
          onAction={() => router.push('/results')}
        />
      ) : visibleCount === 0 && realLoaded ? (
        <Text style={{ textAlign: 'center', color: colors.ink3, fontSize: 12.5, paddingTop: 30 }}>مفيش محادثات مطابقة.</Text>
      ) : (
        <Animated.ScrollView onScroll={fabScrollHandler} scrollEventThrottle={16} contentContainerStyle={{ paddingHorizontal: spacing.s5, paddingBottom: 150 }}>
          {visibleReal.map((c) => (
            <RealConversationRow key={c.id} conversation={c} language={language} onPress={() => router.push(`/chat/${c.id}`)} />
          ))}
          {visibleMock.map((c) => (
            <ConversationRow key={c.id} conversation={c} onPress={() => router.push(`/chat/${c.id}`)} />
          ))}
        </Animated.ScrollView>
      )}
    </View>
  );
}

function RealConversationRow({ conversation: c, language, onPress }: { conversation: RealConversationMeta; language: 'ar' | 'en'; onPress: () => void }) {
  const { colors, spacing, radius, elevation } = useTheme();
  const unread = c.unread ?? 0;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        gap: spacing.s3,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.r3,
        padding: spacing.s3,
        marginBottom: spacing.s3,
        position: 'relative',
        ...elevation.e1.ios,
        elevation: elevation.e1.android.elevation,
      }}
    >
      {c.listing?.thumb ? (
        <ThumbPlaceholder variant="a" photoUri={c.listing.thumb} width={44} height={44} radius={radius.r2} />
      ) : (
        <Avatar initials={c.otherParty.name ? c.otherParty.name.slice(0, 2) : '؟'} />
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{c.otherParty.name || 'مستخدم سوق مصر'}</Text>
          <Text style={{ fontSize: 9.5, color: colors.ink3 }}>{formatListTime(c.lastMessageAt, language)}</Text>
        </View>
        <Text numberOfLines={1} style={{ fontSize: 11, color: colors.ink2, marginTop: 4 }}>
          {c.lastMessagePreview || 'ابدأ المحادثة'}
        </Text>
        {c.listing ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: colors.paper,
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: 8,
              paddingVertical: 4,
              paddingHorizontal: 8,
              marginTop: 8,
              alignSelf: 'flex-start',
            }}
          >
            <Text style={{ fontSize: 9.5, color: colors.ink3 }}>
              {c.listing.title} —{' '}
              <Text style={{ color: colors.ink, fontWeight: '700' }}>
                {c.listing.price.toLocaleString('en-US')} ج.م
              </Text>
            </Text>
          </View>
        ) : null}
      </View>
      {unread > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: spacing.s3,
            left: spacing.s3,
            backgroundColor: colors.signal,
            minWidth: 19,
            height: 19,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 5,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function ConversationRow({ conversation: c, onPress }: { conversation: Conversation; onPress: () => void }) {
  const { colors, spacing, radius, elevation } = useTheme();
  const seller = useSeller(c.sellerId);
  const listing = useListingById(c.listingId);
  if (!seller) return null;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        gap: spacing.s3,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.r3,
        padding: spacing.s3,
        marginBottom: spacing.s3,
        position: 'relative',
        ...elevation.e1.ios,
        elevation: elevation.e1.android.elevation,
      }}
    >
      <Avatar initials={seller.initials} color={seller.avatarColor} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{seller.name}</Text>
          <Text style={{ fontSize: 9.5, color: colors.ink3 }}>{c.time}</Text>
        </View>
        <Text numberOfLines={1} style={{ fontSize: 11, color: colors.ink2, marginTop: 4 }}>
          {c.lastMessageFromMe ? '✓✓ ' : ''}
          {c.lastMessage}
        </Text>
        {listing ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: colors.paper,
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: 8,
              paddingVertical: 4,
              paddingHorizontal: 8,
              marginTop: 8,
              alignSelf: 'flex-start',
            }}
          >
            <Text style={{ fontSize: 9.5, color: colors.ink3 }}>
              {listing.title} —{' '}
              <Text style={{ color: colors.ink, fontWeight: '700' }}>
                {listing.price.toLocaleString('en-US')} ج.م
              </Text>
            </Text>
          </View>
        ) : null}
      </View>
      {c.unread > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: spacing.s3,
            left: spacing.s3,
            backgroundColor: colors.signal,
            minWidth: 19,
            height: 19,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 5,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{c.unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
