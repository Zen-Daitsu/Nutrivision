import "../../global.css"; // CORRECTION : Requis pour injecter Tailwind dans Expo Router
import { Tabs } from 'expo-router';
import { MaterialSymbols } from '@expo/vector-icons';
import { DesignTokens } from '../theme/design-tokens';

export default function AppLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: DesignTokens.colors.onPrimaryContainer,
      tabBarInactiveTintColor: DesignTokens.colors.onSurfaceVariant,
      tabBarStyle: {
        backgroundColor: DesignTokens.colors.surface,
        borderTopWidth: 1,
        borderTopColor: 'rgba(187, 202, 191, 0.2)',
        height: 80,
        paddingBottom: 20,
      }
    }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: "Journal",
          headerShown: false,
          tabBarIcon: ({ color }) => <MaterialSymbols name="restaurant_menu" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="analyze" 
        options={{ 
          title: "Analyser",
          tabBarIcon: ({ color }) => <MaterialSymbols name="photo_camera" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="recipes" 
        options={{ 
          title: "Recettes",
          tabBarIcon: ({ color }) => <MaterialSymbols name="auto_awesome" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: "Profil",
          tabBarIcon: ({ color }) => <MaterialSymbols name="person" size={24} color={color} />
        }} 
      />
    </Tabs>
  );
}