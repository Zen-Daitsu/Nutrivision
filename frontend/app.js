{
  "expo": {
    "name": "NutriVision",
    "slug": "nutrivision-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "nutrivision",
    "userInterfaceStyle": "automatic",
    "plugins": [
      "expo-router",
      [
        "expo-camera",
        {
          "cameraPermission": "NutriVision utilise la caméra pour photographier vos repas.",
          "recordAudioAndroid": false
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "NutriVision accède à vos photos pour analyser une image de repas.",
          "cameraPermission": false,
          "microphonePermission": false
        }
      ],
      "expo-font"
    ],
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "NutriVision utilise la caméra pour analyser vos repas.",
        "NSPhotoLibraryUsageDescription": "NutriVision accède à vos photos pour analyser une image de repas."
      }
    },
    "android": {
      "package": "com.zendaitsu.nutrivision",
      "permissions": ["CAMERA"]
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "name": "NutriVision",
      "shortName": "NutriVision",
      "themeColor": "#0B1013",
      "backgroundColor": "#0B1013",
      "display": "standalone",
      "orientation": "portrait"
    },
    "experiments": {
      "typedRoutes": true
    }
  }
}
