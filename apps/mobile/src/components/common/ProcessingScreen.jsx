// src/components/common/ProcessingScreen.jsx

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing } from '../../constants/theme';

export function ProcessingScreen({ title = 'Processing…', subtitle, steps = [], accentColor = Colors.gold }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, useNativeDriver: true })
    ).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.spinner, { borderTopColor: accentColor, transform: [{ rotate }] }]} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}

      <View style={styles.steps}>
        {steps.map((step, i) => (
          <View key={i} style={styles.step}>
            <View style={[
              styles.dot,
              step.status === 'active' && { backgroundColor: accentColor },
              step.status === 'done'   && styles.dotDone,
            ]} />
            <Text style={[
              styles.stepLbl,
              step.status === 'active' && { color: Colors.text },
              step.status === 'done'   && { color: Colors.green },
            ]}>
              {step.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────

// src/components/common/SuccessScreen.jsx
export function SuccessScreen({ title, subtitle, children, accentColor = Colors.gold }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.successIcon, { borderColor: accentColor }]}>
        <Text style={[styles.successCheck, { color: accentColor }]}>✓</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  spinner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: Colors.border2,
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  sub: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.text2,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  steps: {
    marginTop: Spacing.lg,
    alignSelf: 'stretch',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border2,
  },
  dotDone: {
    backgroundColor: Colors.green,
  },
  stepLbl: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.muted,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  successCheck: {
    fontSize: 28,
    fontFamily: Fonts.sansBd,
  },
});
