import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';

import { colors, fonts } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Abas principais. Ícone "cheio" quando a aba está ativa, "contorno" quando não. */
const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'inicio', title: 'Início', icon: 'home-outline', iconActive: 'home' },
  { name: 'clientes', title: 'Clientes', icon: 'people-outline', iconActive: 'people' },
  { name: 'funil', title: 'Funil', icon: 'funnel-outline', iconActive: 'funnel' },
  { name: 'tarefas', title: 'Tarefas', icon: 'checkbox-outline', iconActive: 'checkbox' },
  { name: 'perfil', title: 'Perfil', icon: 'person-circle-outline', iconActive: 'person-circle' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.graphite,
        tabBarInactiveTintColor: colors.slate,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, size }) => (
              <Ionicons
                name={focused ? tab.iconActive : tab.icon}
                size={size - 2}
                color={focused ? colors.primary : colors.slate}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
