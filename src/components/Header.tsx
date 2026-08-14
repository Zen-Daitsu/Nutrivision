import React from 'react';
import { View, Text, Image } from 'react-native';

export function Header() {
  return (
    <View className="flex-row justify-between items-center px-margin-mobile py-4 bg-background border-b border-outline-variant/10">
      <View>
        <Text className="text-xs font-bold tracking-widest text-primary uppercase">NutriVision</Text>
        <Text className="text-xl font-bold text-on-surface">Bonjour ! 👋</Text>
      </View>
      
      {/* Photo de Profil / Avatar */}
      <View className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-primary overflow-hidden">
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' }} 
          className="w-full h-full"
        />
      </View>
    </View>
  );
}
