import React, { useRef, useState } from 'react';
import {
  View,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ImageCarouselProps {
  images: string[];
  height?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ImageCarousel({ images, height = 400 }: ImageCarouselProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  // If only one image, don't show carousel indicators
  const showIndicators = images.length > 1;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const scrollToIndex = (index: number) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: index * SCREEN_WIDTH,
        animated: true,
      });
    }
  };

  const goToPrevious = () => {
    if (activeIndex > 0) {
      scrollToIndex(activeIndex - 1);
    }
  };

  const goToNext = () => {
    if (activeIndex < images.length - 1) {
      scrollToIndex(activeIndex + 1);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {images.map((imageUrl, index) => (
          <View key={index} style={[styles.imageContainer, { width: SCREEN_WIDTH, height }]}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        ))}
      </ScrollView>
      
      {showIndicators && (
        <View style={styles.indicatorContainer}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                activeIndex === index && styles.activeIndicator,
              ]}
            />
          ))}
        </View>
      )}
      
      {showIndicators && images.length > 1 && (
        <>
          {activeIndex > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.leftButton]}
              onPress={goToPrevious}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          {activeIndex < images.length - 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.rightButton]}
              onPress={goToNext}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#fff',
  },
  scrollView: {
    flexGrow: 0,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeIndicator: {
    backgroundColor: '#000',
    width: 24,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 1,
  },
  leftButton: {
    left: 16,
  },
  rightButton: {
    right: 16,
  },
});

