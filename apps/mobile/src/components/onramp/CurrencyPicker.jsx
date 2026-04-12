// src/components/onramp/CurrencyPicker.jsx

import React from 'react';
import {
  Modal, View, Text, FlatList,
  TouchableOpacity, StyleSheet,
} from 'react-native';
import { ONRAMP_CURRENCIES } from '../../constants/currencies';
import { Colors, Fonts, Spacing } from '../../constants/theme';

export default function CurrencyPicker({ visible, selected, onSelect, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Currency</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={ONRAMP_CURRENCIES}
            keyExtractor={(c) => c.code}
            renderItem={({ item: c }) => (
              <TouchableOpacity
                style={[styles.item, selected?.code === c.code && styles.itemSelected]}
                onPress={() => onSelect(c)}
              >
                <Text style={styles.flag}>{c.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.code}>{c.code}</Text>
                  <Text style={styles.name}>{c.name}</Text>
                </View>
                <Text style={styles.rate}>{c.symbol}{c.rate.toLocaleString()} / USD</Text>
                {selected?.code === c.code && (
                  <Text style={styles.check}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const S = StyleSheet.create;

const styles = S({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,6,2,0.7)' },
  sheet: {
    backgroundColor: Colors.soil,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontFamily: Fonts.serif, fontSize: 18, color: Colors.text },
  closeBtn: {
    width: 28, height: 28, backgroundColor: Colors.clay,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  closeIcon: { fontSize: 13, color: Colors.muted },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.xl, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: 'rgba(74,53,32,0.4)',
  },
  itemSelected: { backgroundColor: 'rgba(155,89,182,0.06)' },
  flag: { fontSize: 22 },
  code: { fontFamily: Fonts.monoBd, fontSize: 13, color: Colors.text },
  name: { fontSize: 10, color: Colors.muted, marginTop: 2 },
  rate: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.text2 },
  check: { fontSize: 14, color: Colors.purple, marginLeft: 8 },
});
