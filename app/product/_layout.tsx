// app/product/_layout.tsx
import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

import { Colors } from '@/constants/Colors';

export default function ProductLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: false, // Make header opaque
        headerStyle: {
          backgroundColor: '#fff', // Set a solid white background
        },
        title: '',
        headerShadowVisible: false, // Remove shadow line under header
        headerBackTitleVisible: false,
        // Replace default back button with a custom one
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.navigate('/(tabs)')} style={{ marginLeft: 10 }}>
            <Feather name="arrow-left" size={24} color={Colors.light.primary} />
          </TouchableOpacity>
        ),
      }}
    />
  );
}
