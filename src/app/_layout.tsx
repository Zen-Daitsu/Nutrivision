import '../../global.css';
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { AppProviders } from '../providers/AppProviders';
import { DesignTokens } from '../theme/design-tokens';

export default function AppLayout() {
  return (
    <AppProviders>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: DesignTokens.colors.onPrimaryContainer,
          tabBarInactiveTintColor: DesignTokens.colors.onSurfaceVariant,
          tabBarStyle: {
            backgroundColor: DesignTokens.colors.surface,
            borderTopWidth: 1,
            borderTopColor: 'rgba(187, 202, 191, 0.2)',
            height: 80,
            paddingBottom: 20,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Journal',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="restaurant-menu" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="analyze"
          options={{
            title: 'Analyser',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="photo-camera" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="recipes" options={{ href: null }} />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="person" size={24} color={color} />
            ),
          }}
        />
      </Tabs>
    </AppProviders>
  );
}
