// src/components/onramp/TokenPicker.jsx

import React from 'react';
import {
  Modal, View, Text, FlatList,
  TouchableOpacity, StyleSheet,
} from 'react-native';
import { ONRAMP_TOKENS } from '../../constants/tokens';
import { Colors, Fonts, Spacing } from '../../constants/theme';

export default function TokenPicker({ visible, selected, onSelect, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Asset</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={ONRAMP_TOKENS}
            keyExtractor={(t) => t.sym}
            renderItem={({ item: t }) => (
              <TouchableOpacity
                style={[styles.item, selected?.sym === t.sym && styles.itemSelected]}
                onPress={() => onSelect(t)}
              >
                <View style={styles.iconBox}>
                  <Text style={styles.iconTxt}>{t.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sym}>{t.sym}</Text>
                  <Text style={styles.desc}>{t.desc}</Text>
                </View>
                <Text style={styles.price}>${t.price.toLocaleString()}</Text>
                {selected?.sym === t.sym && (
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

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,6,2,0.7)' },
  sheet: {
    backgroundColor: Colors.soil,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '70%',
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
  iconBox: {
    width: 36, height: 36, backgroundColor: Colors.clay2,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  iconTxt: { fontFamily: Fonts.monoBd, fontSize: 14, color: Colors.gold2 },
  sym:  { fontFamily: Fonts.monoBd, fontSize: 13, color: Colors.text },
  desc: { fontSize: 10, color: Colors.muted, marginTop: 2 },
  price: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.text2 },
  check: { fontSize: 14, color: Colors.purple, marginLeft: 8 },
});
