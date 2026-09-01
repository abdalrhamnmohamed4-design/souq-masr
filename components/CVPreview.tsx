/**
 * components/CVPreview.tsx — عرض سيرة ذاتية حقيقية متولّدة من بيانات
 * الملف المهني الفعلية (PART 16) بـ5 قوالب بصرية مختلفة فعليًا (مش نفس
 * التصميم بلون مختلف بس) — Modern/Classic/Professional/Minimal/
 * Executive. مفيش تصدير PDF حقيقي لسه (يحتاج مكتبة توليد PDF)، بس ده
 * عرض حقيقي وكامل من بيانات المستخدم الفعلية، قابل للمشاركة كصورة من
 * غير أي محتوى وهمي.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { CAREER_LEVEL_LABELS, LANGUAGE_LEVEL_LABELS, SKILL_LEVEL_LABELS, type CareerProfile, type ResumeTemplate } from '@/mock/jobs/types';

type TemplateTheme = {
  bg: string;
  headerBg: string;
  headerFg: string;
  accent: string;
  sectionTitleColor: string;
  bodyColor: string;
  layout: 'stacked' | 'sidebar';
  headerAlign: 'right' | 'center';
};

const THEMES: Record<ResumeTemplate, TemplateTheme> = {
  modern: { bg: '#fff', headerBg: '#F4511E', headerFg: '#fff', accent: '#F4511E', sectionTitleColor: '#F4511E', bodyColor: '#2A2E36', layout: 'stacked', headerAlign: 'right' },
  classic: { bg: '#fff', headerBg: '#fff', headerFg: '#0F1A2E', accent: '#0F1A2E', sectionTitleColor: '#0F1A2E', bodyColor: '#333', layout: 'stacked', headerAlign: 'center' },
  professional: { bg: '#fff', headerBg: '#0F1A2E', headerFg: '#fff', accent: '#0F1A2E', sectionTitleColor: '#0F1A2E', bodyColor: '#2A2E36', layout: 'sidebar', headerAlign: 'right' },
  minimal: { bg: '#fff', headerBg: '#fff', headerFg: '#111', accent: '#888', sectionTitleColor: '#111', bodyColor: '#444', layout: 'stacked', headerAlign: 'right' },
  executive: { bg: '#FAFAF8', headerBg: '#1A1A1A', headerFg: '#D4AF37', accent: '#D4AF37', sectionTitleColor: '#1A1A1A', bodyColor: '#222', layout: 'stacked', headerAlign: 'right' },
};

export const RESUME_TEMPLATE_LABELS: Record<ResumeTemplate, string> = {
  modern: 'عصري', classic: 'كلاسيكي', professional: 'احترافي', minimal: 'بسيط', executive: 'تنفيذي',
};

export function CVPreview({ profile, template }: { profile: CareerProfile; template: ResumeTemplate }) {
  const t = THEMES[template];

  return (
    <View style={{ backgroundColor: t.bg, borderRadius: 12, overflow: 'hidden' }}>
      <View style={{ backgroundColor: t.headerBg, padding: 20, alignItems: t.headerAlign === 'center' ? 'center' : 'flex-end', borderBottomWidth: template === 'classic' ? 2 : 0, borderBottomColor: '#0F1A2E' }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: t.headerFg, textAlign: t.headerAlign }}>{profile.fullName || 'اسمك هنا'}</Text>
        {profile.currentJobTitle ? <Text style={{ fontSize: 12, color: t.headerFg, opacity: 0.85, marginTop: 4, textAlign: t.headerAlign }}>{profile.currentJobTitle}</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8, justifyContent: t.headerAlign === 'center' ? 'center' : 'flex-end' }}>
          {profile.phone ? <Text style={{ fontSize: 10, color: t.headerFg, opacity: 0.75 }}>{profile.phone}</Text> : null}
          {profile.email ? <Text style={{ fontSize: 10, color: t.headerFg, opacity: 0.75 }}>{profile.email}</Text> : null}
          {profile.city ? <Text style={{ fontSize: 10, color: t.headerFg, opacity: 0.75 }}>{profile.city}</Text> : null}
        </View>
      </View>

      <View style={{ padding: 18, gap: 16 }}>
        {profile.desiredJobTitle || profile.careerLevel ? (
          <Row label="الهدف الوظيفي" theme={t}>
            <Text style={{ fontSize: 11.5, color: t.bodyColor, lineHeight: 18 }}>
              {profile.desiredJobTitle ?? ''}{profile.careerLevel ? ` — ${CAREER_LEVEL_LABELS[profile.careerLevel]}` : ''}
            </Text>
          </Row>
        ) : null}

        {profile.experience.length > 0 ? (
          <Row label="الخبرات العملية" theme={t}>
            {profile.experience.map((e) => (
              <View key={e.id} style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: t.bodyColor }}>{e.jobTitle} — {e.company}</Text>
                <Text style={{ fontSize: 10, color: t.accent, marginTop: 1 }}>
                  {e.startDate.slice(0, 4)} - {e.isCurrent ? 'حاليًا' : e.endDate?.slice(0, 4) ?? ''} · {e.location}
                </Text>
                {e.responsibilities.slice(0, 3).map((r, i) => (
                  <Text key={i} style={{ fontSize: 10.5, color: t.bodyColor, marginTop: 3, lineHeight: 16 }}>• {r}</Text>
                ))}
              </View>
            ))}
          </Row>
        ) : null}

        {profile.education.length > 0 ? (
          <Row label="التعليم" theme={t}>
            {profile.education.map((e) => (
              <View key={e.id} style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: t.bodyColor }}>{e.degree} — {e.fieldOfStudy}</Text>
                <Text style={{ fontSize: 10, color: t.accent, marginTop: 1 }}>{e.institution} · {e.startDate.slice(0, 4)}{e.graduationDate ? ` - ${e.graduationDate.slice(0, 4)}` : ''}</Text>
              </View>
            ))}
          </Row>
        ) : null}

        {profile.skills.length > 0 ? (
          <Row label="المهارات" theme={t}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {profile.skills.map((s) => (
                <View key={s.id} style={{ borderWidth: 1, borderColor: t.accent, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
                  <Text style={{ fontSize: 9.5, color: t.accent }}>{s.name} · {SKILL_LEVEL_LABELS[s.level]}</Text>
                </View>
              ))}
            </View>
          </Row>
        ) : null}

        {profile.languages.length > 0 ? (
          <Row label="اللغات" theme={t}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {profile.languages.map((l) => (
                <Text key={l.id} style={{ fontSize: 10.5, color: t.bodyColor }}>{l.language} ({LANGUAGE_LEVEL_LABELS[l.overall]})</Text>
              ))}
            </View>
          </Row>
        ) : null}

        {profile.certifications.length > 0 ? (
          <Row label="الشهادات" theme={t}>
            {profile.certifications.map((c) => (
              <Text key={c.id} style={{ fontSize: 10.5, color: t.bodyColor, marginBottom: 3 }}>{c.name} — {c.issuer}</Text>
            ))}
          </Row>
        ) : null}
      </View>
    </View>
  );
}

function Row({ label, theme, children }: { label: string; theme: TemplateTheme; children: React.ReactNode }) {
  return (
    <View>
      <Text style={{ fontSize: 11, fontWeight: '800', color: theme.sectionTitleColor, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      {children}
    </View>
  );
}

export default CVPreview;
