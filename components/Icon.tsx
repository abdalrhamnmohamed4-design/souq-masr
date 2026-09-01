/**
 * components/Icon.tsx
 *
 * كل الـ <symbol id="..."> من الـ SVG sprite في أول mazad-v2.html
 * (66 أيقونة) محوّلة لمكوّن واحد <Icon name="..." /> باستخدام
 * react-native-svg، بنفس viewBox / d / stroke-width / stroke-linecap
 * الأصلية — من غير أي تعديل أو أيقونة مخترعة.
 *
 * ملاحظة تصحيح: طلب المستخدم ذكر إن الأيقونات "بادئتها s-" في الملف —
 * ده مش صحيح فعليًا، الـ id بيبقى الاسم مباشرة (id="search" مش
 * id="s-search"). الأسماء هنا مطابقة لـ ids الفعلية.
 *
 * الافتراضيات مطابقة لكلاس .i في CSS الأصلي:
 *   width/height: 20  (== .i)  |  .sm=16  |  .lg=24
 *   stroke: currentColor (= الـ color prop هنا لأن RN مالوش currentColor)
 *   fill: none, stroke-width: 1.7, stroke-linecap/linejoin: round
 * وأيقونة "wa" بس فيها جزء filled (fill=currentColor, stroke=none) —
 * itemized separately below (اتساقًا مع .i.fill في الأصل).
 */

import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect, SvgProps } from 'react-native-svg';

type PathShape = { type: 'path'; d: string; filled?: boolean };
type CircleShape = { type: 'circle'; cx: number; cy: number; r: number };
type RectShape = {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
};
type EllipseShape = {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

type IconShape = PathShape | CircleShape | RectShape | EllipseShape;

type IconDef = {
  viewBox?: string; // default '0 0 24 24'
  shapes: IconShape[];
};

const p = (d: string, filled = false): PathShape => ({ type: 'path', d, filled });
const c = (cx: number, cy: number, r: number): CircleShape => ({ type: 'circle', cx, cy, r });
const r = (x: number, y: number, width: number, height: number, rx?: number): RectShape => ({
  type: 'rect',
  x,
  y,
  width,
  height,
  rx,
});
const e = (cx: number, cy: number, rx: number, ry: number): EllipseShape => ({
  type: 'ellipse',
  cx,
  cy,
  rx,
  ry,
});

export const ICONS = {
  search: { shapes: [c(11, 11, 7), p('m20 20-3.5-3.5')] },
  cam: {
    shapes: [
      p(
        'M3 8.5A2.5 2.5 0 0 1 5.5 6h1.2a2 2 0 0 0 1.7-1l.5-.8A2 2 0 0 1 10.6 3h2.8a2 2 0 0 1 1.7 1.2l.5.8a2 2 0 0 0 1.7 1h1.2A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z',
      ),
      c(12, 12.5, 3.2),
    ],
  },
  bell: {
    shapes: [
      p('M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7'),
      p('M13.7 20a2 2 0 0 1-3.4 0'),
    ],
  },
  pin: { shapes: [p('M20 10c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 1 1 16 0'), c(12, 10, 2.8)] },
  home: { shapes: [p('M3 10.5 12 3l9 7.5'), p('M5.5 9.5V20h13V9.5')] },
  grid: {
    shapes: [
      r(3.5, 3.5, 7, 7, 2),
      r(13.5, 3.5, 7, 7, 2),
      r(3.5, 13.5, 7, 7, 2),
      r(13.5, 13.5, 7, 7, 2),
    ],
  },
  plus: { shapes: [p('M12 5v14M5 12h14')] },
  chat: { shapes: [p('M20 12a8 8 0 0 1-8 8H4l2-2.5A8 8 0 1 1 20 12')] },
  user: { shapes: [c(12, 8, 3.8), p('M4.5 20a7.5 7.5 0 0 1 15 0')] },
  heart: {
    shapes: [
      p(
        'M12 20s-7.5-4.7-7.5-9.6A4.4 4.4 0 0 1 12 7.5a4.4 4.4 0 0 1 7.5 2.9C19.5 15.3 12 20 12 20',
      ),
    ],
  },
  'chev-r': { shapes: [p('m14.5 5-7 7 7 7')] },
  'chev-l': { shapes: [p('m9.5 5 7 7-7 7')] },
  phone: {
    shapes: [
      p(
        'M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2',
      ),
    ],
  },
  mic: { shapes: [r(9, 3, 6, 11, 3), p('M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3')] },
  'mic-off': {
    shapes: [
      p('M9 5a3 3 0 0 1 6 0v6'),
      p('M5.5 11.5a6.5 6.5 0 0 0 9.6 5.7M12 18v3'),
      p('m4 3 16 18'),
    ],
  },
  spk: {
    shapes: [
      p('M5 9.5h3l4-3.5v12l-4-3.5H5z'),
      p('M16 9.2a4 4 0 0 1 0 5.6M18.6 6.6a7.5 7.5 0 0 1 0 10.8'),
    ],
  },
  'spk-off': {
    shapes: [p('M5 9.5h3l4-3.5v12l-4-3.5H5z'), p('m16.5 9.5 5 5M21.5 9.5l-5 5')],
  },
  keypad: {
    shapes: [
      c(6.5, 6, 1.4),
      c(12, 6, 1.4),
      c(17.5, 6, 1.4),
      c(6.5, 12, 1.4),
      c(12, 12, 1.4),
      c(17.5, 12, 1.4),
      c(6.5, 18, 1.4),
      c(12, 18, 1.4),
      c(17.5, 18, 1.4),
    ],
  },
  check: { shapes: [p('m5 12.5 4.5 4.5L19 7')] },
  ticks: {
    viewBox: '0 0 30 22',
    shapes: [p('m3 12 4.5 4.5L17 6'), p('m12.5 12 4.5 4.5L27 6')],
  },
  shield: {
    shapes: [p('M12 3 5 6v6c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6z'), p('m9 12 2 2 4-4')],
  },
  star: { shapes: [p('m12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.6-.8z')] },
  eye: {
    shapes: [p('M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12'), c(12, 12, 3)],
  },
  clock: { shapes: [c(12, 12, 8.5), p('M12 7.5V12l3 2')] },
  cog: {
    shapes: [
      c(12, 12, 3),
      p(
        'M19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 14h-.3a2 2 0 1 1 0-4h.2A1.6 1.6 0 0 0 4.5 7.2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1v-.3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1',
      ),
    ],
  },
  sliders: {
    shapes: [p('M5 6h14M5 12h14M5 18h14'), c(9, 6, 2), c(15, 12, 2), c(8, 18, 2)],
  },
  edit: { shapes: [p('M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5z')] },
  trash: { shapes: [p('M4.5 6.5h15M9 6.5V4.5h6v2M6.5 6.5 7.5 20h9l1-13.5')] },
  copy: {
    shapes: [
      r(8.5, 8.5, 11, 11, 2.5),
      p('M5.5 15.5A2 2 0 0 1 4.5 14V6a2 2 0 0 1 2-2h8a2 2 0 0 1 1.5.7'),
    ],
  },
  send: { shapes: [p('M20 4 3.5 11.5l6.5 2 2 6.5z'), p('m10 13.5 10-9.5')] },
  clip: {
    shapes: [
      p(
        'M20 11.5 12 19.5a5 5 0 0 1-7-7l8.5-8.5a3.4 3.4 0 0 1 4.8 4.8l-8.4 8.4a1.8 1.8 0 0 1-2.5-2.5l7.8-7.8',
      ),
    ],
  },
  lock: { shapes: [r(4.5, 10, 15, 10.5, 2.5), p('M8 10V7.5a4 4 0 0 1 8 0V10')] },
  globe: {
    shapes: [
      c(12, 12, 8.5),
      p(
        'M3.5 12h17M12 3.5c2.2 2.4 3.3 5.3 3.3 8.5S14.2 18.1 12 20.5c-2.2-2.4-3.3-5.3-3.3-8.5S9.8 5.9 12 3.5',
      ),
    ],
  },
  moon: { shapes: [p('M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5')] },
  face: {
    shapes: [
      p(
        'M4 8.5V6a2 2 0 0 1 2-2h2.5M15.5 4H18a2 2 0 0 1 2 2v2.5M20 15.5V18a2 2 0 0 1-2 2h-2.5M8.5 20H6a2 2 0 0 1-2-2v-2.5',
      ),
      p('M9 10.5v1M15 10.5v1M9.5 15a3.5 3.5 0 0 0 5 0'),
    ],
  },
  id: {
    shapes: [
      r(3, 5.5, 18, 13, 2.5),
      c(9, 11.5, 2),
      p('M5.8 16a3.4 3.4 0 0 1 6.4 0M14.5 10h4M14.5 13.5h2.5'),
    ],
  },
  wallet: {
    shapes: [
      p('M3.5 7.5A2.5 2.5 0 0 1 6 5h11a2 2 0 0 1 2 2v1.5'),
      r(3.5, 7.5, 17, 11.5, 2.5),
      c(16, 13.2, 1.3),
    ],
  },
  share: {
    shapes: [
      c(17.5, 6, 2.5),
      c(6.5, 12, 2.5),
      c(17.5, 18, 2.5),
      p('m8.8 10.8 6.4-3.5M8.8 13.2l6.4 3.5'),
    ],
  },
  logout: {
    shapes: [
      p('M14 4.5h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-4'),
      p('M9.5 8 5.5 12l4 4M5.5 12H15'),
    ],
  },
  doc: { shapes: [p('M6 3.5h8l4.5 4.5v12.5H6z'), p('M14 3.5V8h4.5M9 13h6M9 16.5h4')] },
  help: {
    shapes: [
      c(12, 12, 8.5),
      p('M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 17h.01'),
    ],
  },
  info: { shapes: [c(12, 12, 8.5), p('M12 11v5.5M12 7.8h.01')] },
  flag: { shapes: [p('M5.5 21V4M5.5 5h11l-2 3.5 2 3.5h-11')] },
  ban: { shapes: [c(12, 12, 8.5), p('m6.5 6.5 11 11')] },
  devices: {
    shapes: [r(2.5, 5.5, 12, 9, 2), r(16, 9, 5.5, 10, 1.8), p('M6 18.5h5')],
  },
  box: {
    shapes: [
      p('M3.5 8 12 4l8.5 4-8.5 4z'),
      p('M3.5 8v8l8.5 4 8.5-4V8'),
      p('M12 12v8'),
    ],
  },
  car: {
    shapes: [
      p('M4 15.5V12l2-5h12l2 5v3.5'),
      p('M2.5 12h19M6.5 19v-3.5h11V19'),
      c(7.5, 15.5, 1.2),
      c(16.5, 15.5, 1.2),
    ],
  },
  house: { shapes: [p('M3.5 10 12 3.5l8.5 6.5V20h-17z'), p('M10 20v-5h4v5')] },
  mobile: { shapes: [r(6.5, 2.5, 11, 19, 2.5), p('M10.5 18.5h3')] },
  sofa: {
    shapes: [
      p('M4 13V8.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2V13'),
      p('M2.5 13.5a2 2 0 0 1 4 0V17h11v-3.5a2 2 0 0 1 4 0V19h-19z'),
    ],
  },
  laptop: { shapes: [r(4.5, 5, 15, 10, 2), p('M2.5 18.5h19')] },
  case: {
    shapes: [
      r(3, 7.5, 18, 12, 2.5),
      p('M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5'),
    ],
  },
  shirt: {
    shapes: [
      p(
        'M8.5 3.5 4 6l1.5 4 2-.8V20h9V9.2l2 .8L20 6l-4.5-2.5a3.5 3.5 0 0 1-7 0',
      ),
    ],
  },
  bike: {
    shapes: [c(6, 16, 3.2), c(18, 16, 3.2), p('M9 16h5l-2-6 3-2M11 6h3')],
  },
  paw: {
    shapes: [
      e(7, 8.5, 1.9, 2.4),
      e(12, 6.8, 1.9, 2.4),
      e(17, 8.5, 1.9, 2.4),
      p('M12 12c3 0 5.5 2.2 5.5 4.6S15.2 20.5 12 20.5s-5.5-1.5-5.5-3.9S9 12 12 12'),
    ],
  },
  tool: {
    shapes: [
      p('M14.5 6.5a4 4 0 0 0 5.2 5.2L11 20.5a2.5 2.5 0 0 1-3.5-3.5z'),
      p('m6 4 3 3-2 2-3-3z'),
    ],
  },
  baby: {
    shapes: [
      c(12, 9, 5),
      p('M9.8 8.5h.01M14.2 8.5h.01M10.2 11a3 3 0 0 0 3.6 0'),
      p('M6.5 15.5A7 7 0 0 0 12 20.5a7 7 0 0 0 5.5-5'),
    ],
  },
  game: {
    shapes: [
      r(2.5, 7.5, 19, 9.5, 4),
      p('M7 10.8v2.4M5.8 12h2.4M15.5 11.2h.01M18 13.2h.01'),
    ],
  },
  office: {
    shapes: [
      p('M4 20V5.5h9V20'),
      p(
        'M13 10h7v10M6.5 8.5h1M10 8.5h1M6.5 12h1M10 12h1M6.5 15.5h1M10 15.5h1M16 13h1M16 16.5h1',
      ),
    ],
  },
  book: {
    shapes: [
      p('M4.5 4.5h6a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5h-6.5z'),
      p('M19.5 4.5h-6a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5h6.5z'),
    ],
  },
  x: { shapes: [p('m6 6 12 12M18 6 6 18')] },
  rocket: {
    shapes: [
      p('M13.5 4.5c3.5 2 5 5.5 5 9l-3.5 3.5H9L5.5 13.5c0-3.5 1.5-7 5-9z'),
      c(12, 10, 1.8),
      p('M9 17c-1.5 1-2 2.5-2 4 1.5 0 3-.5 4-2M15 17c1.5 1 2 2.5 2 4-1.5 0-3-.5-4-2'),
    ],
  },
  refresh: { shapes: [p('M20 12a8 8 0 1 1-2.6-5.9'), p('M20 4v4.5h-4.5')] },
  qr: {
    shapes: [
      r(3.5, 3.5, 6.5, 6.5, 1.5),
      r(14, 3.5, 6.5, 6.5, 1.5),
      r(3.5, 14, 6.5, 6.5, 1.5),
      p('M14 14h3v3h-3zM20.5 14v3M17.5 20.5h3'),
    ],
  },
  wa: {
    shapes: [
      p('M3.5 20.5 5 16.6A8 8 0 1 1 8 19.4z'),
      p(
        'M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1a4.5 4.5 0 0 1-2-2l1-1-1-2z',
        true, // fill=currentColor stroke=none في الأصل (.i.fill)
      ),
    ],
  },
  link: {
    shapes: [
      p('M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1'),
      p('M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1'),
    ],
  },

  // ---- أضيفوا من مرجع الهوم الجديد (mazadhome.html) بنفس أسلوب الرسم ----
  menu: { shapes: [p('M4 7h16M4 12h16M4 17h10')] },
  flame: { shapes: [p('M12 3s5 4.2 5 9a5 5 0 0 1-10 0c0-1.7 1-3 1-3s.5 1.6 1.7 1.6C11.5 10.6 9.5 7 12 3z', true)] },
  'chev-d': { shapes: [p('M6 9l6 6 6-6')] },
  down: { shapes: [p('M12 5v13M6.5 12.5L12 18l5.5-5.5')] },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;

export interface IconProps extends Omit<SvgProps, 'width' | 'height' | 'viewBox'> {
  name: IconName;
  size?: number; // .i = 20 (default) | .i.sm = 16 | .i.lg = 24
  color?: string; // بيحل محل currentColor
  strokeWidth?: number; // .i { stroke-width: 1.7 }
}

export function Icon({ name, size = 20, color = '#0F1A2E', strokeWidth = 1.7, ...rest }: IconProps) {
  const def = ICONS[name];
  return (
    <Svg
      width={size}
      height={size}
      viewBox={('viewBox' in def && def.viewBox) || '0 0 24 24'}
      {...rest}
    >
      {def.shapes.map((shape, i) => {
        if (shape.type === 'path') {
          return shape.filled ? (
            <Path key={i} d={shape.d} fill={color} stroke="none" />
          ) : (
            <Path
              key={i}
              d={shape.d}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        }
        if (shape.type === 'circle') {
          return (
            <Circle
              key={i}
              cx={shape.cx}
              cy={shape.cy}
              r={shape.r}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        }
        if (shape.type === 'rect') {
          return (
            <Rect
              key={i}
              x={shape.x}
              y={shape.y}
              width={shape.width}
              height={shape.height}
              rx={shape.rx}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        }
        // ellipse
        return (
          <Ellipse
            key={i}
            cx={shape.cx}
            cy={shape.cy}
            rx={shape.rx}
            ry={shape.ry}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </Svg>
  );
}

export default Icon;
