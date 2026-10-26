import Svg, { Circle, Path } from 'react-native-svg';

import { C } from '@/lib/theme';

type P = { size?: number; color?: string; stroke?: number };
const base = (size = 24, color: string = C.text, stroke = 1.8) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: stroke,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

export const Mark = ({ size = 34 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={C.text} strokeWidth={1.8} strokeLinecap="round">
    <Path d="M9 34V24a8 8 0 0 1 16 0v10" />
    <Path d="M6 34h28" />
    <Path d="M28.5 34V15L30 11.5 31.5 15v19" strokeLinejoin="round" />
    <Path d="M29 8.5a2.4 2.4 0 1 0 2-3.9 3 3 0 0 1-2 3.9z" stroke={C.accent} />
    <Path d="M17 16v-3" />
  </Svg>
);

export const IconHome = ({ size, color, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></Svg>
);
export const IconBook = ({ size, color, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><Path d="M4 5.5v16" /></Svg>
);
export const IconChat = ({ size, color, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.8A8 8 0 1 1 21 12z" /><Path d="M8.5 11h7M8.5 14h4.5" /></Svg>
);
export const IconCompass = ({ size, color, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Circle cx="12" cy="12" r="9" /><Path d="m15.5 8.5-2 5-5 2 2-5z" /></Svg>
);
export const IconUser = ({ size, color, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Circle cx="12" cy="8" r="4" /><Path d="M4 21a8 8 0 0 1 16 0" /></Svg>
);
export const IconFlame = ({ size, color, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Path d="M12 3c2 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.5 2 1.5 3 3 3-1-3 0-6 0-8.5z" /></Svg>
);
export const IconBack = ({ size, color, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Path d="M19 12H5M11 18l-6-6 6-6" /></Svg>
);
export const IconNext = ({ size, color, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Path d="M5 12h14M13 6l6 6-6 6" /></Svg>
);
export const IconChevron = ({ size = 18, color = C.muted, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Path d="m9 6 6 6-6 6" /></Svg>
);
export const IconBookmark = ({ size, color, stroke, filled }: P & { filled?: boolean }) => (
  <Svg {...base(size, color, stroke)} fill={filled ? color : 'none'}><Path d="M6 3h12v18l-6-4-6 4z" /></Svg>
);
export const IconHeart = ({ size, color, stroke, filled }: P & { filled?: boolean }) => (
  <Svg {...base(size, color, stroke)} fill={filled ? color : 'none'}><Path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z" /></Svg>
);
export const IconNote = ({ size, color, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Path d="M4 20h4L19 9l-4-4L4 16z" /><Path d="m13.5 6.5 4 4" /></Svg>
);
export const IconShare = ({ size, color, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Path d="M12 3v12M7 8l5-5 5 5" /><Path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></Svg>
);
export const IconSettings = ({ size, color, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Circle cx="12" cy="12" r="3" /><Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Svg>
);
export const IconSearch = ({ size, color, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Circle cx="11" cy="11" r="7" /><Path d="m20 20-3.5-3.5" /></Svg>
);
export const IconTrophy = ({ size, color, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0z" /><Path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></Svg>
);
export const IconUsers = ({ size, color, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Circle cx="9" cy="8" r="3.5" /><Path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><Path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14a6.5 6.5 0 0 1 3 6" /></Svg>
);
export const IconGift = ({ size, color, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Path d="M4 11h16v10H4zM3 7h18v4H3zM12 7v14" /><Path d="M12 7C10 3 6.5 3.5 7 6c.3 1 2 1 5 1zM12 7c2-4 5.5-3.5 5-1-.3 1-2 1-5 1z" /></Svg>
);
export const IconStar = ({ size, color, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></Svg>
);
export const IconPlay = ({ size, color }: P) => (
  <Svg width={size ?? 20} height={size ?? 20} viewBox="0 0 24 24" fill={color ?? C.text}><Path d="M7 4v16l13-8z" /></Svg>
);
export const IconClose = ({ size, color, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Path d="M6 6l12 12M18 6 6 18" /></Svg>
);
export const IconBell = ({ size, color, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Path d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22z" /><Path d="M18 16V11a6 6 0 0 0-12 0v5l-2 2h16z" /></Svg>
);
export const IconSend = ({ size, color, stroke }: P) => (
  <Svg {...base(size, color, stroke)}><Path d="M4 12 20 4l-6 16-3-7z" /></Svg>
);
