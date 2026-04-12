// src/components/common/SheetModal.jsx
// Thin wrapper around @gorhom/bottom-sheet.
// All feature sheets (Send, Swap, Onramp, etc.) use this as their base.

import React, { useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import KenteStrip from './KenteStrip';
import { Colors, Fonts, Spacing } from '../../constants/theme';

export default function SheetModal({
  isOpen,
  onClose,
  title,
  snapPoints = ['85%'],
  children,
  scrollable = true,
}) {
  const sheetRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [isOpen]);

  const handleChange = useCallback((index) => {
    if (index === -1) onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.7}
        style={{ backgroundColor: 'rgba(10,6,2,0.7)' }}
      />
    ),
    []
  );

  const ContentWrapper = scrollable ? BottomSheetScrollView : View;

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleChange}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      {/* Kente accent strip */}
      <KenteStrip height={3} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      <ContentWrapper
        contentContainerStyle={scrollable ? styles.body : undefined}
        style={!scrollable ? styles.body : undefined}
      >
        {children}
      </ContentWrapper>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: Colors.soil,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    backgroundColor: Colors.border2,
    width: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    color: Colors.text,
  },
  closeBtn: {
    width: 28,
    height: 28,
    backgroundColor: Colors.clay,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 13,
    color: Colors.muted,
    fontFamily: Fonts.sans,
  },
  body: {
    padding: Spacing.xl,
    paddingBottom: 40,
  },
});
