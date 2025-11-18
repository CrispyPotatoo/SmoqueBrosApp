import { Feather } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Image, TouchableOpacity, View } from 'react-native';
import { CartIcon } from '../../components/CartIcon';

export default function TabsLayout() {
  const router = useRouter();

  const handleContactPress = () => {
    router.push('/contact');
  };
  const handleSearchPress = () => {
    router.push('/search');
  };

  const renderHeaderLeft = () => (
    <TouchableOpacity
      onPress={handleContactPress}
      accessibilityRole="button"
      accessibilityLabel="Contact Us"
      style={{ marginLeft: 16 }}
    >
      <Feather name="phone" size={22} color="#222" />
    </TouchableOpacity>
  );

  const renderHeaderRight = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
      <TouchableOpacity onPress={handleSearchPress} accessibilityRole="button" accessibilityLabel="Search">
        <Feather name="search" size={24} color="#222" />
      </TouchableOpacity>
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#595959',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Feather name="home" color={color} size={size} />,
          headerShown: true,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#ffffff',
            elevation: 1,
            shadowOpacity: 0.1,
            borderBottomWidth: 1,
            borderBottomColor: '#e0e0e0',
          },
          headerTitle: () => (
            <TouchableOpacity onPress={() => router.push('/')}>
              <Image
                source={require('../../assets/images/Smoque_Bros_Logo.png')}
                style={{ width: 120, height: 40, resizeMode: 'contain' }}
              />
            </TouchableOpacity>
          ),
          headerLeft: renderHeaderLeft,
          headerRight: renderHeaderRight,
        }}
      />

      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <CartIcon color={color} size={size} />,
          headerShown: true,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#ffffff',
            elevation: 1,
            shadowOpacity: 0.1,
            borderBottomWidth: 1,
            borderBottomColor: '#e0e0e0',
          },
          headerTitle: () => (
            <TouchableOpacity onPress={() => router.push('/')}>
              <Image
                source={require('../../assets/images/Smoque_Bros_Logo.png')}
                style={{ width: 120, height: 40, resizeMode: 'contain' }}
              />
            </TouchableOpacity>
          ),
          headerLeft: renderHeaderLeft,
          headerRight: renderHeaderRight,
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Feather name="user" color={color} size={size} />,
          headerShown: true,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#ffffff',
            elevation: 1,
            shadowOpacity: 0.1,
            borderBottomWidth: 1,
            borderBottomColor: '#e0e0e0',
          },
          headerTitle: () => (
            <TouchableOpacity onPress={() => router.push('/')}>
              <Image
                source={require('../../assets/images/Smoque_Bros_Logo.png')}
                style={{ width: 120, height: 40, resizeMode: 'contain' }}
              />
            </TouchableOpacity>
          ),
          headerLeft: renderHeaderLeft,
          headerRight: renderHeaderRight,
        }}
      />
    </Tabs>
  );
}
