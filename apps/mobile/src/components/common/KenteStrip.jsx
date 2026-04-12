// src/components/common/KenteStrip.jsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { KENTE } from '../../constants/theme';

const SEGMENT_W = 10;

export default function KenteStrip({ height = 4, style }) {
  return (
    <View style={[styles.strip, { height }, style]}>
      {Array.from({ length: 60 }).map((_, i) => (
        <View
          key={i}
          style={{
            width: SEGMENT_W,
            height: '100%',
            backgroundColor: KENTE[i % KENTE.length],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    overflow: 'hidden',
    flexShrink: 0,
  },
});
