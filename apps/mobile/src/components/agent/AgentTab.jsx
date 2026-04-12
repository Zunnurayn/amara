// src/components/agent/AgentTab.jsx

import React, { useState } from 'react';
import { ScrollView, View, Text, Switch, StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing } from '../../constants/theme';

const MODES = [
  { key: 'arb',    icon: '⚡', name: 'Arb Bot',          sub: 'Flash + triangular',          default: true  },
  { key: 'yield',  icon: '🌾', name: 'Yield Optimizer',   sub: 'Aerodrome LP auto-compound',  default: true  },
  { key: 'reb',    icon: '⚖️', name: 'Auto-Rebalance',   sub: '±5% drift threshold',         default: true  },
  { key: 'brickt', icon: '🏗️', name: 'Brickt Pools',     sub: 'Lagos + Abuja · 4 active',    default: true  },
];

export default function AgentTab() {
  const [modes, setModes] = useState(
    Object.fromEntries(MODES.map(m => [m.key, m.default]))
  );

  const toggle = (key) => setModes(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Header stats */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Agent Control</Text>
          <View style={styles.runningBadge}>
            <View style={styles.runningDot} />
            <Text style={styles.runningTxt}>RUNNING</Text>
          </View>
        </View>
        <View style={styles.stats}>
          {[
            { num: '23',   lbl: 'Actions' },
            { num: '+$312', lbl: 'Gained',  color: Colors.green },
            { num: '0',    lbl: 'Errors',   color: Colors.green },
          ].map((s) => (
            <View key={s.lbl} style={styles.stat}>
              <Text style={[styles.statNum, s.color && { color: s.color }]}>{s.num}</Text>
              <Text style={styles.statLbl}>{s.lbl}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Mode toggles */}
      <View style={styles.modeList}>
        {MODES.map((m) => (
          <View key={m.key} style={styles.modeRow}>
            <View style={styles.modeLeft}>
              <Text style={styles.modeIcon}>{m.icon}</Text>
              <View>
                <Text style={styles.modeName}>{m.name}</Text>
                <Text style={styles.modeSub}>{m.sub}</Text>
              </View>
            </View>
            <Switch
              value={modes[m.key]}
              onValueChange={() => toggle(m.key)}
              trackColor={{ false: Colors.border2, true: Colors.green + '80' }}
              thumbColor={modes[m.key] ? Colors.green : Colors.muted}
            />
          </View>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  header: {
    margin: Spacing.lg,
    backgroundColor: Colors.soil,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.lg,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  headerTitle: { fontFamily: Fonts.serif, fontSize: 20, color: Colors.text },
  runningBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(46,204,113,0.1)',
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.25)',
    paddingHorizontal: 10, paddingVertical: 4,
  },
  runningDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.green },
  runningTxt: { fontSize: 9, fontFamily: Fonts.sansBd, color: Colors.green, letterSpacing: 1.5 },
  stats: { flexDirection: 'row', gap: Spacing.xl },
  stat: {},
  statNum: { fontFamily: Fonts.serif, fontSize: 22, color: Colors.gold2 },
  statLbl: { fontSize: 9, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 2 },
  modeList: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.clay,
    borderWidth: 1, borderColor: Colors.border,
  },
  modeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: 'rgba(74,53,32,0.4)',
  },
  modeLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  modeIcon: { fontSize: 22 },
  modeName: { fontFamily: Fonts.sansBd, fontSize: 13, color: Colors.text },
  modeSub:  { fontSize: 10, color: Colors.muted, marginTop: 2 },
});
