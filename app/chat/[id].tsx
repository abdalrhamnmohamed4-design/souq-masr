/**
 * app/chat/[id].tsx — يقابل #chat: هيدر + سياق الإعلان + صف الهاتف + فقاعات
 * + ردود سريعة + إدخال.
 *
 * تدفق تأكيد البيع (Sold Confirmation Flow): لما البائع (صاحب الإعلان
 * المرتبط بالمحادثة دي) يبعت عبارة بيع واضحة زي "اتباع خلاص"
 * (lib/soldIntent.ts)، بتفتح بطاقة تأكيد — مش تغيير حالة فوري. البطاقة
 * دي **مش** جزء من سجل الرسائل المحفوظ (شوف useAppStore.pendingSaleConfirmation)،
 * بعكس رسالة النظام النهائية "تم تسجيل الإعلان كمباع..." اللي فعلاً
 * بتتضاف للمحادثة (addSystemMessage) وبتتعرض بشكل مختلف بصريًا (kind:'system').
 *
 * ملحوظة صادقة: في البنية المحلية الحالية (مستخدم واحد "me")، المحادثة
 * الوحيدة اللي "me" بيبقى فيها بائع فعليًا هي لو "me" فتح شات على إعلانه
 * هو نفسه من صفحة تفاصيله — مفيش مستخدم تاني حقيقي يقدر يبدأ شات مع
 * "me" من غير باك إند متعدد المستخدمين (نفس القيد الموثّق في
 * ACCESS_CONTROL.md's §5). الكشف نفسه شغّال صح تقنيًا بغض النظر — جاهز
 * لما مستخدمين حقيقيين يبقوا موجودين.
 */
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { ThumbPlaceholder } from '@/components/primitives/ThumbPlaceholder';
import { Avatar } from '@/components/primitives/Avatar';
import { IconButton } from '@/components/primitives/IconButton';
import { useAuthGuard } from '@/components/AuthGuard';
import { useRequireOnline } from '@/lib/connectivityGuard';
import { looksLikeSoldIntent } from '@/lib/soldIntent';
import { SALE_METHOD_LABELS, SALE_METHOD_ORDER, type SaleMethod } from '@/types/sale';
import { useAppStore, useListingById, useSeller } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

const QUICK_REPLIES = ['تمام هتفناها', 'اتباع خلاص', 'ابعتلي موقعك', 'السعر نهائي؟'];

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const conversation = useAppStore((s) => s.conversations.find((c) => c.id === id));
  const sendMessage = useAppStore((s) => s.sendMessage);
  const sendImageMessage = useAppStore((s) => s.sendImageMessage);
  const blockSeller = useAppStore((s) => s.blockSeller);
  const seller = useSeller(conversation?.sellerId);
  const listing = useListingById(conversation?.listingId);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const requireOnline = useRequireOnline();

  // ---- تدفق تأكيد البيع ----
  const pendingSale = useAppStore((s) => s.pendingSaleConfirmation);
  const startSaleConfirmation = useAppStore((s) => s.startSaleConfirmation);
  const advanceToSaleMethod = useAppStore((s) => s.advanceToSaleMethod);
  const showCustomSaleMethodInput = useAppStore((s) => s.showCustomSaleMethodInput);
  const cancelSoldConfirmation = useAppStore((s) => s.cancelSoldConfirmation);
  const confirmListingSold = useAppStore((s) => s.confirmListingSold);
  const [customMethod, setCustomMethod] = useState('');
  const isMineSale = pendingSale?.conversationId === conversation?.id ? pendingSale : null;

  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تدردش', description: 'المراسلة مع البائعين متاحة بس للمستخدمين المسجّلين.' });
  if (authBlock) return authBlock;

  if (!conversation || !seller) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <Text style={{ color: colors.ink3 }}>المحادثة مش موجودة</Text>
      </View>
    );
  }

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    requireOnline(() => {
      sendMessage(conversation.id, text);
      setDraft('');
      // البائع بس (صاحب الإعلان ده فعليًا) هو اللي فتح "نية بيع" — مش أي
      // رسالة فيها العبارة دي من أي حد (القسم 5: منع تفعيل غير مقصود).
      if (listing && listing.sellerId === 'me' && listing.saleStatus !== 'sold' && looksLikeSoldIntent(text)) {
        startSaleConfirmation(conversation.id, listing.id);
      }
    });
  };

  const attachImage = () => {
    requireOnline(async () => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('محتاجين صلاحية الصور', 'من غير صلاحية الوصول لمعرض الصور مش هنقدر نبعت الصورة.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (result.canceled || !result.assets[0]) return;
      sendImageMessage(conversation.id, result.assets[0].uri);
    });
  };

  const copyNumber = async () => {
    await Clipboard.setStringAsync(seller.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, paddingTop: insets.top + spacing.s2, paddingBottom: spacing.s2, paddingHorizontal: spacing.s4, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <IconButton onPress={() => router.back()}>
          <Icon name="chev-r" color={colors.ink} />
        </IconButton>
        <Avatar initials={seller.initials} color={seller.avatarColor} />
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{seller.name}</Text>
          <Text style={{ fontSize: 9.5, color: colors.ink3 }}>آخر ظهور اليوم</Text>
        </View>
        <IconButton onPress={() => router.push(`/call/${seller.id}`)}>
          <Icon name="phone" color={colors.ink} />
        </IconButton>
        {seller.id !== 'me' ? (
          <IconButton
            onPress={() =>
              Alert.alert('حظر المستخدم', `متأكد إنك عايز تحظر ${seller.name}؟ مش هيقدر يراسلك تاني.`, [
                { text: 'إلغاء', style: 'cancel' },
                { text: 'حظر', style: 'destructive', onPress: () => { blockSeller(seller.id); router.back(); } },
              ])
            }
          >
            <Icon name="ban" color={colors.danger} />
          </IconButton>
        ) : null}
      </View>

      {listing ? (
        <Pressable
          onPress={() => router.push(`/detail/${listing.id}`)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, marginHorizontal: spacing.s5, marginTop: spacing.s3, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: 9 }}
        >
          <ThumbPlaceholder variant={listing.thumb} photoUri={listing.photoUris?.[0]} width={38} height={38} radius={radius.r1} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 11, color: colors.ink }}>{listing.title}</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink }}>{listing.price.toLocaleString('en-US')} ج.م</Text>
          </View>
          {listing.saleStatus === 'sold' ? (
            <View style={{ backgroundColor: colors.verifyWash, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.verify }}>مباع</Text>
            </View>
          ) : (
            <Icon name="chev-r" size={16} color={colors.ink3} />
          )}
        </Pressable>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s2, marginHorizontal: spacing.s5, marginTop: spacing.s2 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.s2, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, paddingVertical: 10, paddingHorizontal: spacing.s3 }}>
          <Icon name="mobile" size={16} color={colors.ink3} />
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink, fontVariant: ['tabular-nums'] }}>{seller.phone}</Text>
        </View>
        <Pressable onPress={copyNumber} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, height: 42, paddingHorizontal: spacing.s3, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icon name={copied ? 'check' : 'copy'} size={14} color={colors.ink} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink }}>{copied ? 'اتنسخ' : 'نسخ'}</Text>
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL(`tel:${seller.phone}`)}
          style={{ backgroundColor: colors.verify, borderRadius: radius.r2, height: 42, paddingHorizontal: spacing.s3, flexDirection: 'row', alignItems: 'center', gap: 5 }}
        >
          <Icon name="phone" size={14} color="#fff" />
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>اتصال</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.s5, gap: spacing.s2 }}>
        <Text style={{ textAlign: 'center', fontSize: 9.5, color: colors.ink3, marginBottom: spacing.s2 }}>اليوم</Text>
        {conversation.bubbles.map((b) =>
          b.kind === 'system' ? (
            <View key={b.id} style={{ alignSelf: 'center', maxWidth: '90%', backgroundColor: colors.verifyWash, borderWidth: 1, borderColor: colors.verify, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, marginVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="check" size={12} color={colors.verify} />
              <Text style={{ fontSize: 11, color: colors.verify, fontWeight: '600', textAlign: 'center' }}>{b.text}</Text>
            </View>
          ) : (
            <View
              key={b.id}
              style={{
                maxWidth: '76%',
                alignSelf: b.from === 'me' ? 'flex-start' : 'flex-end',
                backgroundColor: b.from === 'me' ? colors.signal : colors.card,
                borderWidth: b.from === 'them' ? 1 : 0,
                borderColor: colors.line,
                borderRadius: 16,
                padding: b.imageUri ? 6 : undefined,
                paddingVertical: b.imageUri ? undefined : 10,
                paddingHorizontal: b.imageUri ? undefined : 13,
                overflow: 'hidden',
              }}
            >
              {b.imageUri ? (
                <Image source={{ uri: b.imageUri }} style={{ width: 180, height: 180, borderRadius: 12 }} resizeMode="cover" />
              ) : (
                <Text style={{ fontSize: 12.5, color: b.from === 'me' ? '#fff' : colors.ink, lineHeight: 20 }}>{b.text}</Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5, paddingHorizontal: b.imageUri ? 6 : 0 }}>
                <Text style={{ fontSize: 9, color: b.from === 'me' ? 'rgba(255,255,255,.85)' : colors.ink3, fontVariant: ['tabular-nums'] }}>
                  {b.time}
                </Text>
                {b.from === 'me' ? <Icon name="ticks" size={13} color={b.read ? '#9EDDFF' : 'rgba(255,255,255,.85)'} /> : null}
              </View>
            </View>
          ),
        )}
      </ScrollView>

      {isMineSale ? (
        <SoldConfirmationCard
          stage={isMineSale.stage}
          customMethod={customMethod}
          onChangeCustomMethod={setCustomMethod}
          onMarkSold={advanceToSaleMethod}
          onNotSold={() => {
            cancelSoldConfirmation();
          }}
          onPickMethod={(method) => {
            if (method === 'other') {
              showCustomSaleMethodInput();
              return;
            }
            requireOnline(() => confirmListingSold(method));
          }}
          onSubmitCustomMethod={() => {
            if (!customMethod.trim()) return;
            requireOnline(() => {
              confirmListingSold('other', customMethod.trim());
              setCustomMethod('');
            });
          }}
        />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.s2, paddingHorizontal: spacing.s5, paddingBottom: spacing.s3, alignItems: 'flex-start' }}>
          {QUICK_REPLIES.map((q) => (
            <Pressable key={q} onPress={() => setDraft(q)} style={{ alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 13 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ink }}>{q}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <ChatComposer value={draft} onChangeText={setDraft} onSend={send} onAttach={attachImage} bottomInset={insets.bottom} />
    </KeyboardAvoidingView>
  );
}

/** بطاقة تأكيد البيع — القسم 1/2/6 من طلب Sold Confirmation Flow. مش
 * جزء من سجل الرسائل، بتظهر بديلة للردود السريعة طول ما التدفق شغّال. */
function SoldConfirmationCard({
  stage,
  customMethod,
  onChangeCustomMethod,
  onMarkSold,
  onNotSold,
  onPickMethod,
  onSubmitCustomMethod,
}: {
  stage: 'ask_sold' | 'ask_method' | 'ask_custom_method';
  customMethod: string;
  onChangeCustomMethod: (v: string) => void;
  onMarkSold: () => void;
  onNotSold: () => void;
  onPickMethod: (method: SaleMethod) => void;
  onSubmitCustomMethod: () => void;
}) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={{ marginHorizontal: spacing.s5, marginBottom: spacing.s3, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.signal, borderRadius: radius.r3, padding: spacing.s4 }}>
      {stage === 'ask_sold' ? (
        <>
          <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 14, color: colors.ink, textAlign: 'center' }}>مبروك 🎉</Text>
          <Text style={{ fontSize: 12.5, color: colors.ink2, textAlign: 'center', marginTop: 4, marginBottom: spacing.s3 }}>
            هل تم بيع المنتج؟
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.s2 }}>
            <Pressable onPress={onNotSold} style={{ flex: 1, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, paddingVertical: 11, alignItems: 'center' }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink2 }}>غير مباع ✕</Text>
            </Pressable>
            <Pressable onPress={onMarkSold} style={{ flex: 1, backgroundColor: colors.signal, borderRadius: radius.r2, paddingVertical: 11, alignItems: 'center' }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#fff' }}>مباع ✓</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {stage === 'ask_method' ? (
        <>
          <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 13.5, color: colors.ink, textAlign: 'center', marginBottom: spacing.s3 }}>
            تم البيع عن طريق إيه؟
          </Text>
          <View style={{ gap: spacing.s2 }}>
            {SALE_METHOD_ORDER.map((method) => (
              <Pressable
                key={method}
                onPress={() => onPickMethod(method)}
                style={{ backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, paddingVertical: 11, paddingHorizontal: spacing.s3, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.ink }}>{SALE_METHOD_LABELS[method]}</Text>
                <Icon name="chev-l" size={14} color={colors.ink3} />
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {stage === 'ask_custom_method' ? (
        <>
          <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 13.5, color: colors.ink, textAlign: 'center', marginBottom: spacing.s3 }}>
            اكتب طريقة البيع
          </Text>
          <TextInput
            value={customMethod}
            onChangeText={onChangeCustomMethod}
            placeholder="مثلاً: عن طريق صاحبي"
            placeholderTextColor={colors.ink3}
            style={{ backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, paddingVertical: 11, paddingHorizontal: spacing.s3, fontSize: 12.5, color: colors.ink, marginBottom: spacing.s3 }}
          />
          <Pressable
            onPress={onSubmitCustomMethod}
            disabled={!customMethod.trim()}
            style={{ backgroundColor: colors.signal, borderRadius: radius.r2, paddingVertical: 11, alignItems: 'center', opacity: customMethod.trim() ? 1 : 0.5 }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#fff' }}>تأكيد</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

/** موحّد شكله مع القسم 11: [مرفق] [حقل الرسالة القابل للتوسّع] [مايك/إرسال].
 * الزرار الأخير بيتغيّر حسب فيه نص وللا لأ — مايك وهو فاضي، إرسال بلون
 * البراند لما فيه نص. */
function ChatComposer({
  value,
  onChangeText,
  onSend,
  onAttach,
  bottomInset,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSend: () => void;
  onAttach: () => void;
  bottomInset: number;
}) {
  const { colors, spacing } = useTheme();
  const hasText = value.trim().length > 0;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        paddingHorizontal: spacing.s4,
        paddingTop: spacing.s3,
        paddingBottom: Math.max(spacing.s3, bottomInset),
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.line,
      }}
    >
      <Pressable
        onPress={onAttach}
        style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="clip" size={18} color={colors.ink2} />
      </Pressable>

      <View
        style={{
          flex: 1,
          minHeight: 42,
          maxHeight: 112,
          backgroundColor: colors.paper,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 21,
          justifyContent: 'center',
          paddingHorizontal: spacing.s3,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="اكتب رسالتك..."
          placeholderTextColor={colors.ink3}
          multiline
          style={{ fontSize: 12.5, color: colors.ink, lineHeight: 18, paddingVertical: 10, maxHeight: 92 }}
        />
      </View>

      <Pressable
        onPress={hasText ? onSend : () => Alert.alert('التسجيل الصوتي', 'إرسال رسائل صوتية مش متاح لسه.')}
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: hasText ? colors.signal : colors.paper,
          borderWidth: hasText ? 0 : 1,
          borderColor: colors.line,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={hasText ? 'send' : 'mic'} size={18} color={hasText ? '#fff' : colors.ink2} />
      </Pressable>
    </View>
  );
}
