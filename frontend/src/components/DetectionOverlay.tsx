import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import type { AnalysisImage, DetectedItem } from '../types/inference';

interface DetectionOverlayProps {
  image: AnalysisImage;
  items: DetectedItem[];
}

export function DetectionOverlay({ image, items }: DetectionOverlayProps) {
  const [container, setContainer] = useState({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainer({ width, height });
  };

  const scale = Math.min(
    container.width / image.width || 0,
    container.height / image.height || 0,
  );
  const renderedWidth = image.width * scale;
  const renderedHeight = image.height * scale;
  const offsetX = (container.width - renderedWidth) / 2;
  const offsetY = (container.height - renderedHeight) / 2;

  return (
    <View className="h-72 w-full bg-black" onLayout={handleLayout}>
      <Image source={{ uri: image.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
      {scale > 0 &&
        items.map((item, index) => {
          const [x1, y1, x2, y2] = item.box_xyxy;
          return (
            <View
              key={`${item.class_id}-${index}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: offsetX + x1 * scale,
                top: offsetY + y1 * scale,
                width: Math.max(2, (x2 - x1) * scale),
                height: Math.max(2, (y2 - y1) * scale),
                borderColor: '#10b981',
                borderWidth: 2,
              }}
            >
              <Text className="self-start bg-primary-container px-1.5 py-0.5 text-[10px] font-bold text-on-primary-container">
                {index + 1}. {item.name}
              </Text>
            </View>
          );
        })}
    </View>
  );
}
