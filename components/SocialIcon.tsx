/**
 * components/SocialIcon.tsx — شعارات مزوّدي تسجيل الدخول (جوجل/آبل/
 * فيسبوك) بمساراتها الرسمية.
 *
 * ليه مش جوه components/Icon.tsx: نظام Icon كله **أحادي اللون** (بياخد
 * `color` واحد ويطبّقه على كل الأشكال)، وشعار جوجل لازم يبقى بأربع
 * ألوان رسمية — لو اترسم بلون واحد بيبقى مخالف لإرشادات العلامة وشكله
 * غلط. فالملف ده منفصل عمدًا.
 */
import React from 'react';
import Svg, { Path } from 'react-native-svg';

export type SocialProvider = 'google' | 'apple' | 'facebook';

/** شعار جوجل بألوانه الأربعة الرسمية (viewBox 48) */
function GoogleGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <Path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <Path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <Path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </Svg>
  );
}

function AppleGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M17.05 12.536c-.014-2.365 1.93-3.5 2.017-3.556-1.098-1.606-2.807-1.827-3.416-1.852-1.455-.147-2.84.855-3.58.855-.738 0-1.876-.834-3.084-.811-1.587.023-3.05.922-3.867 2.341-1.648 2.86-.42 7.093 1.184 9.41.784 1.134 1.72 2.408 2.948 2.362 1.183-.047 1.63-.765 3.06-.765 1.43 0 1.833.765 3.084.742 1.273-.023 2.079-1.156 2.86-2.294.9-1.316 1.271-2.59 1.294-2.655-.028-.013-2.483-.953-2.507-3.777M14.79 5.36c.653-.79 1.093-1.888.973-2.982-.94.038-2.078.626-2.753 1.415-.605.7-1.134 1.818-.99 2.89 1.048.081 2.117-.533 2.77-1.323"
      />
    </Svg>
  );
}

function FacebookGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </Svg>
  );
}

export function SocialIcon({
  provider,
  size = 22,
  color = '#fff',
}: {
  provider: SocialProvider;
  size?: number;
  /** بيتطبّق على آبل/فيسبوك بس — جوجل بيفضل بألوانه الرسمية دايمًا. */
  color?: string;
}) {
  if (provider === 'google') return <GoogleGlyph size={size} />;
  if (provider === 'apple') return <AppleGlyph size={size} color={color} />;
  return <FacebookGlyph size={size} color={color} />;
}

export default SocialIcon;
