/**
 * app/jobs/company/[id].tsx — صفحة الشركة العامة (PART 21/23): بياناتها،
 * وظائفها النشطة، تقييمات حقيقية.
 *
 * Phase 2B — Jobs + Services Mobile Wiring: id بصيغة COMP-##### معناه
 * شركة حقيقية — souq_masr.api.v1.companies.get_company +
 * jobs.get_jobs_by_company. نظام تقييم الشركات لسه خارج نطاق الجولة دي
 * (Company review systems على قايمة "DO NOT start" صراحةً) فقسم
 * التقييمات بيبان صادق فاضي وزرار "قيّم الشركة" مختفي للشركات الحقيقية —
 * نفس القرار المتخذ لصفحة ملف المحترف العامة
 * (app/services/professional/[id].tsx) بالظبط. البلاغ مختلف — بلاغ
 * (مش تقييم) على شركة حقيقية بيستخدم contentReportService.ts's
 * reportContent/hasReportedContent مع target_doctype: "Souq Masr Company".
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/primitives/Button';
import { Pill } from '@/components/primitives/Pill';
import { useRequireAuth } from '@/lib/auth';
import { useRequireOnline } from '@/lib/connectivityGuard';
import { WORK_TYPE_LABELS, type JobsReportReason } from '@/mock/jobs/types';
import { getCompany, isRealCompanyId, type RealCompany } from '@/services/companyService';
import { hasReportedContent, reportContent } from '@/services/contentReportService';
import { getJobsByCompany, type RealJobSummary } from '@/services/jobService';
import { useAllJobs, useCompanyById, useJobsReviewsFor, useJobsStore } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

const REPORT_REASONS: { key: JobsReportReason; label: string }[] = [
  { key: 'fake', label: 'شركة وهمية' },
  { key: 'scam', label: 'نصب' },
  { key: 'spam', label: 'سبام' },
  { key: 'abusive', label: 'سلوك مسيء' },
  { key: 'incorrect_info', label: 'معلومات غلط' },
];

export default function CompanyProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return isRealCompanyId(id) ? <RealCompanyProfile id={id!} /> : <MockCompanyProfile />;
}

// ============================================================ REAL
function RealCompanyProfile({ id }: { id: string }) {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const requireAuth = useRequireAuth();
  const [company, setCompany] = useState<RealCompany | null>(null);
  const [jobs, setJobs] = useState<RealJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [reported, setReported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCompany(id).then(async (r) => {
      if (cancelled || r.status !== 'success') {
        setLoading(false);
        return;
      }
      setCompany(r.data);
      const jr = await getJobsByCompany(id, 1, 100);
      if (!cancelled && jr.status === 'success') setJobs(jr.data.items);
      setLoading(false);
      hasReportedContent('Souq Masr Company', id).then((rr) => { if (!cancelled && rr.status === 'success') setReported(rr.data.has_reported); });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  if (!company) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <Text style={{ color: colors.ink3 }}>الشركة مش موجودة</Text>
      </View>
    );
  }

  const isMe = company.isOwner;
  const shareCompany = () => Share.share({ message: `${company.name}\nعلى سوق مصر` });
  const reportCompany = () =>
    requireAuth(() => {
      if (reported) {
        Alert.alert('اتبلّغ عن الشركة دي', 'شكرًا، البلاغ بتاعك اتسجّل وهيتراجع.');
        return;
      }
      Alert.alert('بلّغ عن الشركة', 'اختار السبب', [
        ...REPORT_REASONS.map((r) => ({
          text: r.label,
          onPress: async () => {
            await reportContent('Souq Masr Company', company.id, r.key);
            setReported(true);
            Alert.alert('شكرًا', 'اتسجّل البلاغ وهنراجعه.');
          },
        })),
        { text: 'إلغاء', style: 'cancel' as const },
      ]);
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader
        title="الشركة"
        onBack={() => router.back()}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={shareCompany}>
              <Icon name="share" color={colors.ink} size={18} />
            </Pressable>
          </View>
        }
      />
      <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingBottom: 60 }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 76, height: 76, borderRadius: 22, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {company.logo ? <Image source={{ uri: company.logo }} style={{ width: 76, height: 76 }} /> : <Icon name="office" size={28} color={colors.signal2} />}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.s3 }}>
            <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 16, color: colors.ink }}>{company.name}</Text>
            {company.verification === 'verified' ? <Icon name="shield" size={15} color={colors.verify} /> : null}
          </View>
        </View>

        {company.description ? <Text style={{ fontSize: 12.5, color: colors.ink2, lineHeight: 21, marginTop: spacing.s4, textAlign: 'center' }}>{company.description}</Text> : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: spacing.s4 }}>
          {company.city ? <Pill icon={<Icon name="pin" size={11} color={colors.ink2} />}>{company.city}</Pill> : null}
          {company.industry ? <Pill>{company.industry}</Pill> : null}
          {company.size ? <Pill>{`${company.size} موظف`}</Pill> : null}
        </View>

        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: colors.ink, marginTop: spacing.s6, marginBottom: spacing.s3 }}>
          الوظائف المتاحة ({jobs.length})
        </Text>
        {jobs.length === 0 ? (
          <Text style={{ fontSize: 12, color: colors.ink3 }}>مفيش وظائف نشطة دلوقتي.</Text>
        ) : (
          jobs.map((j) => (
            <Pressable key={j.id} onPress={() => router.push(`/jobs/${j.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: spacing.s3, marginBottom: spacing.s2 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{j.title}</Text>
                <Text style={{ fontSize: 10.5, color: colors.ink3, marginTop: 2 }}>{WORK_TYPE_LABELS[j.workType as keyof typeof WORK_TYPE_LABELS] ?? j.workType} · {j.city}</Text>
              </View>
              <Icon name="chev-l" size={15} color={colors.ink3} />
            </Pressable>
          ))
        )}

        {/* نظام تقييم الشركات الحقيقي خارج النطاق (DO NOT start) — قسم
            صادق بدل تلفيق تقييمات أو استخدام نظام mock منفصل. */}
        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: colors.ink, marginTop: spacing.s6, marginBottom: spacing.s3 }}>التقييمات</Text>
        <Text style={{ fontSize: 11.5, color: colors.ink3 }}>تقييمات الشركات مش متاحة لسه.</Text>

        {!isMe ? (
          <Pressable onPress={reportCompany} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: spacing.s4 }}>
            <Icon name="flag" size={13} color={reported ? colors.danger : colors.ink3} />
            <Text style={{ fontSize: 11, color: reported ? colors.danger : colors.ink3 }}>{reported ? 'اتبلّغ عن الشركة دي' : 'بلّغ عن الشركة دي'}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ============================================================ MOCK (كان موجود قبل كده، من غير تغيير)
function MockCompanyProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const company = useCompanyById(id);
  const jobs = useAllJobs();
  const reviews = useJobsReviewsFor('company', id);
  const addReview = useJobsStore((s) => s.addJobsReview);
  const reportJobsTarget = useJobsStore((s) => s.reportJobsTarget);
  const hasReported = useJobsStore((s) => s.hasReportedJobsTarget);
  const requireAuth = useRequireAuth();
  const requireOnline = useRequireOnline();
  const [rateOpen, setRateOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');

  if (!company) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <Text style={{ color: colors.ink3 }}>الشركة مش موجودة</Text>
      </View>
    );
  }

  const activeJobs = jobs.filter((j) => j.companyId === company.id && j.status === 'published');
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const isMe = company.ownerSellerId === 'me';
  const alreadyReported = hasReported('company', company.id);

  const shareCompany = () => Share.share({ message: `${company.name}\nعلى سوق مصر` });
  const reportCompany = () =>
    requireAuth(() => {
      if (alreadyReported) {
        Alert.alert('اتبلّغ عن الشركة دي', 'شكرًا، البلاغ بتاعك اتسجّل وهيتراجع.');
        return;
      }
      Alert.alert('بلّغ عن الشركة', 'اختار السبب', [
        ...REPORT_REASONS.map((r) => ({
          text: r.label,
          onPress: () => { reportJobsTarget('company', company.id, r.key); Alert.alert('شكرًا', 'اتسجّل البلاغ وهنراجعه.'); },
        })),
        { text: 'إلغاء', style: 'cancel' as const },
      ]);
    });
  const openRate = () => requireAuth(() => setRateOpen((v) => !v));

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader
        title="الشركة"
        onBack={() => router.back()}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={shareCompany}>
              <Icon name="share" color={colors.ink} size={18} />
            </Pressable>
          </View>
        }
      />
      <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingBottom: 60 }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 76, height: 76, borderRadius: 22, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {company.logoUri ? <Image source={{ uri: company.logoUri }} style={{ width: 76, height: 76 }} /> : <Icon name="office" size={28} color={colors.signal2} />}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.s3 }}>
            <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 16, color: colors.ink }}>{company.name}</Text>
            {company.verification === 'verified' ? <Icon name="shield" size={15} color={colors.verify} /> : null}
          </View>
          {avgRating ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Icon name="star" size={13} color={colors.gold} />
              <Text style={{ fontSize: 11.5, color: colors.ink3 }}>{avgRating} · {reviews.length} تقييم</Text>
            </View>
          ) : null}
        </View>

        <Text style={{ fontSize: 12.5, color: colors.ink2, lineHeight: 21, marginTop: spacing.s4, textAlign: 'center' }}>{company.description}</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: spacing.s4 }}>
          <Pill icon={<Icon name="pin" size={11} color={colors.ink2} />}>{company.city}</Pill>
          {company.industry ? <Pill>{company.industry}</Pill> : null}
          <Pill>{`${company.size} موظف`}</Pill>
        </View>

        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: colors.ink, marginTop: spacing.s6, marginBottom: spacing.s3 }}>
          الوظائف المتاحة ({activeJobs.length})
        </Text>
        {activeJobs.length === 0 ? (
          <Text style={{ fontSize: 12, color: colors.ink3 }}>مفيش وظائف نشطة دلوقتي.</Text>
        ) : (
          activeJobs.map((j) => (
            <Pressable key={j.id} onPress={() => router.push(`/jobs/${j.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: spacing.s3, marginBottom: spacing.s2 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{j.title}</Text>
                <Text style={{ fontSize: 10.5, color: colors.ink3, marginTop: 2 }}>{WORK_TYPE_LABELS[j.workType]} · {j.city}</Text>
              </View>
              <Icon name="chev-l" size={15} color={colors.ink3} />
            </Pressable>
          ))
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.s6, marginBottom: spacing.s3 }}>
          <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: colors.ink, flex: 1 }}>التقييمات ({reviews.length})</Text>
          {!isMe ? (
            <Pressable onPress={openRate}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.signal }}>قيّم الشركة</Text>
            </Pressable>
          ) : null}
        </View>
        {rateOpen ? (
          <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3, marginBottom: spacing.s3 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing.s3 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setStars(n)}>
                  <Icon name="star" size={24} color={n <= stars ? colors.gold : colors.line} />
                </Pressable>
              ))}
            </View>
            <TextInput value={comment} onChangeText={setComment} placeholder="اكتب تجربتك (اختياري)" placeholderTextColor={colors.ink3} multiline style={{ minHeight: 60, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: spacing.s3, fontSize: 12, color: colors.ink, textAlignVertical: 'top', marginBottom: spacing.s3 }} />
            <Button
              size="sm"
              onPress={() =>
                requireOnline(() => {
                  addReview({ targetType: 'company', targetId: company.id, rating: stars, comment: comment.trim(), reviewerName: 'مستخدم سوق مصر' });
                  setComment('');
                  setStars(5);
                  setRateOpen(false);
                })
              }
            >
              إرسال التقييم
            </Button>
          </View>
        ) : null}
        {reviews.length === 0 ? (
          <Text style={{ fontSize: 11.5, color: colors.ink3 }}>لسه معندهاش تقييمات.</Text>
        ) : (
          reviews.map((r) => (
            <View key={r.id} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: spacing.s3, marginBottom: spacing.s2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{r.reviewerName}</Text>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((n) => <Icon key={n} name="star" size={11} color={n <= r.rating ? colors.gold : colors.line} />)}
                </View>
              </View>
              {r.comment ? <Text style={{ fontSize: 11, color: colors.ink2, marginTop: 5 }}>{r.comment}</Text> : null}
            </View>
          ))
        )}

        {!isMe ? (
          <Pressable onPress={reportCompany} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: spacing.s4 }}>
            <Icon name="flag" size={13} color={alreadyReported ? colors.danger : colors.ink3} />
            <Text style={{ fontSize: 11, color: alreadyReported ? colors.danger : colors.ink3 }}>{alreadyReported ? 'اتبلّغ عن الشركة دي' : 'بلّغ عن الشركة دي'}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
