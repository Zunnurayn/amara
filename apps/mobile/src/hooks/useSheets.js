// src/hooks/useSheets.js
// Central hook for opening/closing all bottom sheets.
// Wrap your root with <SheetsProvider> and call useSheets() anywhere.

import React, { createContext, useContext, useState } from 'react';

const SheetsContext = createContext(null);

export function SheetsProvider({ children }) {
  const [activeSheet, setActiveSheet] = useState(null); // 'send'|'receive'|'swap'|'bridge'|'onramp'|null

  const openSheet  = (name) => setActiveSheet(name);
  const closeSheet = ()     => setActiveSheet(null);
  const isOpen     = (name) => activeSheet === name;

  return (
    <SheetsContext.Provider value={{ activeSheet, openSheet, closeSheet, isOpen }}>
      {children}
    </SheetsContext.Provider>
  );
}

export function useSheets() {
  const ctx = useContext(SheetsContext);
  if (!ctx) throw new Error('useSheets must be used inside <SheetsProvider>');
  return ctx;
}
