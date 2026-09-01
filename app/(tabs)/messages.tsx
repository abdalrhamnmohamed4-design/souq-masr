/**
 * app/(tabs)/messages.tsx — يقابل #msgs: قائمة محادثات.
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { Avatar } from '@/components/primitives/Avatar';
import { EmptyState } from '@/components/primitives/EmptyState';
import { IconButton } from '@/components/primitives/IconButton';
import { matchesQuery } from '@/lib/search';
import { useFabScrollHandler } from '@/lib/scrollFab';
import { useAllListings, useAppStore, useListingById, useSeller, type Conversation } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function Messages() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const conversations = useAppStore((s) => s.conversations);
  const allListings = useAllListings();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const fabScrollHandler = useFabScrollHandler();
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تشوف رسائلك', description: 'المحادثات مع البائعين هتظهر هنا بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  const visible = query.trim()
    ? conversations.filter((c) => {
        const listing = allListings.find((l) => l.id === c.listingId);
        return matchesQuery(c.lastMessage, query) || (listing ? matchesQuery(listing.title, query) : false);
      })
    : conversations;

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
      {conversations.length === 0 ? (
        <EmptyState
          icon={<Icon name="chat" color={colors.ink3} size={26} />}
          title="لسه مفيش رسائل"
          description="لما تراسل بائع من صفحة أي إعلان، المحادثة هتظهر هنا."
          actionLabel="استكشف الإعلانات"
          onAction={() => router.push('/results')}
        />
      ) : visible.length === 0 ? (
        <Text style={{ textAlign: 'center', color: colors.ink3, fontSize: 12.5, paddingTop: 30 }}>مفيش محادثات مطابقة.</Text>
      ) : (
        <Animated.ScrollView onScroll={fabScrollHandler} scrollEventThrottle={16} contentContainerStyle={{ paddingHorizontal: spacing.s5, paddingBottom: 150 }}>
          {visible.map((c) => (
            <ConversationRow key={c.id} conversation={c} onPress={() => router.push(`/chat/${c.id}`)} />
          ))}
        </Animated.ScrollView>
      )}
    </View>
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
