import "../../global.css";
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
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
          tabBarIcon: ({ color }) => <MaterialIcons name="restaurant-menu" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="analyze" 
        options={{ 
          title: "Analyser",
          tabBarIcon: ({ color }) => <MaterialIcons name="photo-camera" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="recipes" 
        options={{ 
          title: "Recettes",
          tabBarIcon: ({ color }) => <MaterialIcons name="auto-awesome" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: "Profil",
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color} />
        }} 
      />
    </Tabs>
  );
}
