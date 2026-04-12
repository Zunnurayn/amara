// src/components/brief/AgentBrief.jsx

import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity,
  Animated, StyleSheet, ScrollView,
} from 'react-native';
import KenteStrip from '../common/KenteStrip';
import { Colors, Fonts, Spacing } from '../../constants/theme';

const EVENTS = [
  { icon: '⚡', type: 'arb',   label: 'Triangular arb: USDC→ETH→WBTC→USDC', profit: '+$47.32', time: '2h ago' },
  { icon: '🌾', type: 'yield', label: '4.2 AERO rewards claimed and compounded', profit: '+$2.18',  time: '3h ago' },
  { icon: '⚖️', type: 'reb',   label: 'Portfolio rebalanced: ETH 45%→40%',     profit: null,       time: '8h ago' },
  { icon: '🏗️', type: 'brickt',label: 'Brickt Pool #3 (Lagos) yield accrued',  profit: '+$16.00', time: '12h ago' },
];

export default function AgentBrief({ onEnter }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const handleEnter = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 350, useNativeDriver: true }).start(onEnter);
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <KenteStrip height={4} />

      {/* Top */}
      <View style={styles.top}>
        <View style={styles.agentBadge}>
          <View style={styles.agentDot} />
          <Text style={styles.agentLbl}>Agent Online · Base &amp; ETH</Text>
        </View>
        <Text style={styles.greeting}>
          Good morning, <Text style={styles.name}>Shehu.</Text>
        </Text>
        <Text style={styles.sub}>While you were away — last 14 hours.</Text>
      </View>

      {/* Events */}
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            Agent ran <Text style={styles.summaryBold}>23 autonomous actions</Text>.
            Arb net: <Text style={{ color: Colors.green }}>+$70.50</Text>.
            Yield compounded. Portfolio rebalanced. 4 Brickt pools active.{' '}
            <Text style={styles.summaryBold}>Zero errors.</Text>
          </Text>
        </View>

        {EVENTS.map((ev, i) => (
          <View key={i} style={styles.event}>
            <View style={[styles.evIcon, styles[`evIcon_${ev.type}`]]}>
              <Text>{ev.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.evLabel}>{ev.label}</Text>
              <View style={styles.evMeta}>
                <Text style={styles.evTime}>{ev.time}</Text>
                {ev.profit && <Text style={styles.evProfit}>{ev.profit}</Text>}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.stats}>
          {[{ num: '+$312', lbl: 'Gained' }, { num: '23', lbl: 'Actions' }, { num: '0', lbl: 'Errors', color: Colors.green }].map((s, i) => (
            <View key={i}>
              <Text style={[styles.statNum, s.color && { color: s.color }]}>{s.num}</Text>
              <Text style={styles.statLbl}>{s.lbl}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.enterBtn} onPress={handleEnter}>
          <Text style={styles.enterBtnText}>Enter →</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,6,2,0.97)',
    zIndex: 50,
  },
  top: {
    padding: Spacing.xl,
    paddingTop: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.soil,
  },
  agentBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  agentDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.green },
  agentLbl:   { fontSize: 10, fontFamily: Fonts.sansBd, color: Colors.green, letterSpacing: 1.5, textTransform: 'uppercase' },
  greeting:   { fontFamily: Fonts.serif, fontSize: 22, color: Colors.text, lineHeight: 28 },
  name:       { color: Colors.gold2 },
  sub:        { fontSize: 12, color: Colors.muted, marginTop: 4 },
  body:       { flex: 1, padding: Spacing.xl },
  summary: {
    backgroundColor: 'rgba(212,146,10,0.07)',
    borderLeftWidth: 3, borderLeftColor: Colors.gold,
    borderWidth: 1, borderColor: 'rgba(212,146,10,0.18)',
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryText: { fontSize: 12, color: Colors.text2, lineHeight: 19 },
  summaryBold: { color: Colors.gold2, fontFamily: Fonts.sansBd },
  event: {
    flexDirection: 'row', gap: 10,
    alignItems: 'flex-start',
    padding: 10,
    backgroundColor: Colors.clay,
    borderWidth: 1, borderColor: Colors.border,
    marginBottom: 8,
  },
  evIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border2 },
  evIcon_arb:   { backgroundColor: 'rgba(192,57,43,0.18)'  },
  evIcon_yield: { backgroundColor: 'rgba(212,146,10,0.14)' },
  evIcon_reb:   { backgroundColor: 'rgba(72,201,176,0.10)' },
  evIcon_brickt:{ backgroundColor: 'rgba(240,180,41,0.08)' },
  evLabel: { fontSize: 12, color: Colors.text, lineHeight: 18 },
  evMeta:  { flexDirection: 'row', gap: 10, marginTop: 3 },
  evTime:  { fontSize: 10, color: Colors.muted, fontFamily: Fonts.mono },
  evProfit:{ fontSize: 10, fontFamily: Fonts.monoBd, color: Colors.green },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.md,
    padding: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.earth,
  },
  stats:    { flexDirection: 'row', gap: 20 },
  statNum:  { fontFamily: Fonts.serif, fontSize: 18, color: Colors.gold2 },
  statLbl:  { fontSize: 9, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 1 },
  enterBtn: { backgroundColor: Colors.gold, paddingHorizontal: 20, paddingVertical: 11 },
  enterBtnText: { fontFamily: Fonts.sansBd, fontSize: 12, color: Colors.earth, letterSpacing: 1, textTransform: 'uppercase' },
});
