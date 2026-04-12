// src/navigation/AppNavigator.jsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeTab     from '../components/home/HomeTab';
import AgentTab    from '../components/agent/AgentTab';
import SettingsTab from '../components/settings/SettingsTab';
import { Colors, Fonts } from '../constants/theme';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Home',     icon: '⌂', component: HomeTab     },
  { name: 'Agent',    icon: '⚡', component: AgentTab    },
  { name: 'Settings', icon: '⚙',  component: SettingsTab },
];

function TabIcon({ icon, label, focused }) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      {TABS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon icon={tab.icon} label={tab.name} focused={focused} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.soil,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 64,
    paddingBottom: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 3,
    borderTopWidth: 2,
    borderTopColor: 'transparent',
    minWidth: 70,
  },
  tabItemActive: {
    borderTopColor: Colors.gold,
  },
  tabIcon: { fontSize: 20, color: Colors.muted },
  tabIconActive: { color: Colors.gold2 },
  tabLabel: { fontSize: 9, fontFamily: Fonts.sansBd, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  tabLabelActive: { color: Colors.gold2 },
});
