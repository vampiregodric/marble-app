import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Stand-in for a real work photo. Swap for a real <Image> once photos are supplied.
const VARIANTS: [string, string, string][] = [
  ['#3a2f1a', '#000000', '#000000'],
  ['#332a17', '#000000', '#000000'],
  ['#2c2414', '#000000', '#000000'],
  ['#241d10', '#000000', '#000000'],
  ['#3d3119', '#000000', '#000000'],
  ['#2a2211', '#000000', '#000000'],
];

type Props = {
  variant?: number;
  style?: StyleProp<ViewStyle>;
};

export default function PlaceholderThumb({ variant = 0, style }: Props) {
  const colors = VARIANTS[variant % VARIANTS.length];
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={style}
    />
  );
}
