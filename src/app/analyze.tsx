import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { MaterialSymbols } from '@expo/vector-icons'; 

export default function AnalyzeScreen() {
  const [isScanning, setIsScanning] = useState(true);

  return (
    <View className="flex-1 bg-black">
      {/* Viseur de la Caméra (Image simulée pour le moment) */}
      <View className="absolute inset-0 z-0">
        <Image 
          source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCqzX_znBg1WZ3w1PW98Fkr-k-ZHw1bOCgmNv4e91BlODhLi8rG4-mxrVqZHcvRlOHuZu7YK-wacVE0wI5f5RK3qyFZfwK5pJ-zsCPv0KvJR9R2AJCiATwLLl8NAMbt5v5v3uXRhkcACV5WvV0h17QUnBEIBuxpa4E001QIwNdRmB3ghzuuQ1m1kYbaMAHfNsLbkE3D6r6UZb3uMuZzfKQL7eeHPw2BcSG2YaIJATKQVcqGeNbX3J6RIPlZNuEX-raUr_L633AtxV0' }} 
          className="w-full h-full opacity-90"
          resizeMode="cover"
        />
      </View>

      {/* Interface Superposée (Overlay) */}
      <SafeAreaView className="flex-1 justify-between z-10" edges={['top', 'bottom']}>
        
        {/* Header de la Caméra */}
        <View className="flex-row justify-between items-center px-margin-mobile py-4 bg-black/40 backdrop-blur-md">
          <TouchableOpacity className="p-2 rounded-full bg-black/20">
            <MaterialSymbols name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text className="text-white font-semibold tracking-wider text-base">ANALYSE IA</Text>
          <TouchableOpacity className="p-2 rounded-full bg-black/20">
            <MaterialSymbols name="flash_on" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Cadran / Grille de ciblage au centre */}
        <View className="items-center justify-center flex-1">
          <View className="w-64 h-64 border-2 border-white/40 rounded-3xl relative items-center justify-center">
            {/* Coins renforcés pour l'effet scanner */}
            <View className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-md" />
            <View className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-md" />
            <View className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-md" />
            <View className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-md" />

            {/* Ligne d'animation du scan */}
            {isScanning && (
              <View className="absolute w-full h-1 bg-primary/80 shadow-lg shadow-primary top-1/2" />
            )}
            
            <Text className="text-white/64 font-medium text-xs bg-black/50 px-3 py-1 rounded-full text-center">
              Placer le repas au centre
            </Text>
          </View>
        </View>

        {/* Barre de contrôle inférieure */}
        <View className="bg-black/60 backdrop-blur-lg px-margin-mobile py-6 flex-row justify-around items-center">
          {/* Galerie */}
          <TouchableOpacity className="items-center justify-center w-12 h-12 rounded-full bg-white/10">
            <MaterialSymbols name="image" size={24} color="#ffffff" />
          </TouchableOpacity>

          {/* Bouton de capture principal */}
          <TouchableOpacity 
            className="w-20 h-20 rounded-full bg-white border-4 border-white/30 items-center justify-center active:scale-95 transition-all"
            onPress={() => setIsScanning(!isScanning)}
          >
            <View className="w-16 h-16 rounded-full bg-primary items-center justify-center">
              <MaterialSymbols name="photo_camera" size={32} color="#ffffff" />
            </View>
          </TouchableOpacity>

          {/* Saisie manuelle */}
          <TouchableOpacity className="items-center justify-center w-12 h-12 rounded-full bg-white/10">
            <MaterialSymbols name="edit" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}