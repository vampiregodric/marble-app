import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

type IconProps = { size?: number; color?: string };
const base = { viewBox: '0 0 24 24', fill: 'none' };

export function CarIcon({ size = 17, color = '#c6a15b' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base}>
      <Path
        d="M3 16h1.5a2.5 2.5 0 0 0 5 0h5a2.5 2.5 0 0 0 5 0H21v-3.5a1 1 0 0 0-.3-.7l-2.7-2.7a2 2 0 0 0-1.4-.6H15l-1.8-2.7A2 2 0 0 0 11.5 5H7a2 2 0 0 0-2 2v2H3.8a1 1 0 0 0-.9.6L2 12v3a1 1 0 0 0 1 1Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={7.5} cy={16} r={1.4} fill={color} />
      <Circle cx={16.5} cy={16} r={1.4} fill={color} />
    </Svg>
  );
}

export function DropletIcon({ size = 17, color = '#c6a15b' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base}>
      <Path
        d="M12 3c3 4 5.5 7.3 5.5 10.2A5.5 5.5 0 0 1 12 18.7a5.5 5.5 0 0 1-5.5-5.5C6.5 10.3 9 7 12 3Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PenIcon({ size = 17, color = '#c6a15b' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base}>
      <Path
        d="M4 20l1.2-4.8a2 2 0 0 1 .5-.9L15.5 4.5a1.5 1.5 0 0 1 2.1 0l1.9 1.9a1.5 1.5 0 0 1 0 2.1L9.7 18.3a2 2 0 0 1-.9.5L4 20Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SparkIcon({ size = 17, color = '#c6a15b' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base}>
      <Path
        d="M12 3 13.6 9.4 20 11l-6.4 1.6L12 19l-1.6-6.4L4 11l6.4-1.6Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TrendUpIcon({ size = 17, color = '#c6a15b' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base}>
      <Path d="M3 17 9 11l4 4 8-8" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M15 6h6v6" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
    </Svg>
  );
}

export function BoxIcon({ size = 17, color = '#c6a15b' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base}>
      <Path d="M12 3 20 7v10l-8 4-8-4V7Z" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 3v18M4 7l8 4 8-4" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
    </Svg>
  );
}

export function CalendarIcon({ size = 18, color = '#c6a15b' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base}>
      <Rect x={3.5} y={5} width={17} height={15} rx={2} stroke={color} strokeWidth={1.6} />
      <Path d="M3.5 9.5h17M8 3v4M16 3v4" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function HomeIcon({ size = 18, color = '#6b6459' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base}>
      <Path d="M4 11.5 12 4l8 7.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 10v9h5v-5h2v5h5v-9" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function GridIcon({ size = 18, color = '#6b6459' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base}>
      <Rect x={4} y={4} width={7} height={7} rx={1.3} stroke={color} strokeWidth={1.6} />
      <Rect x={13} y={4} width={7} height={7} rx={1.3} stroke={color} strokeWidth={1.6} />
      <Rect x={4} y={13} width={7} height={7} rx={1.3} stroke={color} strokeWidth={1.6} />
      <Rect x={13} y={13} width={7} height={7} rx={1.3} stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

export function BellIcon({ size = 18, color = '#6b6459' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base}>
      <Path
        d="M18 8a6 6 0 0 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M10.5 20a1.7 1.7 0 0 0 3 0" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function UserIcon({ size = 18, color = '#6b6459' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base}>
      <Circle cx={12} cy={8} r={3.4} stroke={color} strokeWidth={1.6} />
      <Path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 14, color = '#6b6459' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base}>
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function BackIcon({ size = 18, color = '#f3efe6' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base}>
      <Path d="M15 5 8 12l7 7" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ShareIcon({ size = 17, color = '#f3efe6' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base}>
      <Circle cx={6} cy={12} r={2.2} stroke={color} strokeWidth={1.6} />
      <Circle cx={18} cy={5.5} r={2.2} stroke={color} strokeWidth={1.6} />
      <Circle cx={18} cy={18.5} r={2.2} stroke={color} strokeWidth={1.6} />
      <Path d="M7.9 10.8 16 6.3M7.9 13.2 16 17.7" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

export function CameraIcon({ size = 11, color = '#0b0a08' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base}>
      <Path d="M4 8h3l2-2h6l2 2h3v11H4Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={13} r={3.2} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function LocationIcon({ size = 12, color = '#c6a15b' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base}>
      <Path
        d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={9.5} r={2.3} stroke={color} strokeWidth={1.7} />
    </Svg>
  );
}

export function EyeIcon({ size = 18, color = '#9c9587' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base}>
      <Path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

export function EyeOffIcon({ size = 18, color = '#9c9587' }: IconProps) {
  return (
    <Svg width={size} height={size} {...base}>
      <Path
        d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.2 3.7M6.5 8.1A17 17 0 0 0 2.5 12S6 18 12 18a9.4 9.4 0 0 0 3.2-.6M9.9 9.9a3 3 0 0 0 4.2 4.2"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
