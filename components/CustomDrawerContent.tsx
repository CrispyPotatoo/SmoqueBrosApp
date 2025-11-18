import { Feather } from '@expo/vector-icons';
import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from '@react-navigation/drawer';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSession } from '../context/SessionProvider';

export function CustomDrawerContent(props: any) {
  const { session, signOut } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollViewContent}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Smoque Bros</Text>
          {session ? (
            <Text style={styles.headerSubtitle}>{session.email}</Text>
          ) : (
            <TouchableOpacity onPress={() => router.push('/(auth)')}>
              <Text style={styles.signInText}>Sign In / Sign Up</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.drawerItemsWrapper}>
          <DrawerItem
            label="Home"
            focused={pathname === '/'}
            activeBackgroundColor={props.activeBackgroundColor}
            activeTintColor={props.activeTintColor}
            inactiveTintColor={props.inactiveTintColor}
            labelStyle={[styles.drawerLabel, { color: pathname === '/' ? props.activeTintColor : props.inactiveTintColor }]}

            onPress={() => router.push('/')}
          />
          <DrawerItem
            label="My Cart"
            focused={pathname === '/cart'}
            activeBackgroundColor={props.activeBackgroundColor}
            activeTintColor={props.activeTintColor}
            inactiveTintColor={props.inactiveTintColor}
            labelStyle={[styles.drawerLabel, { color: pathname === '/cart' ? props.activeTintColor : props.inactiveTintColor }]}

            onPress={() => router.push('/cart')}
          />
          <DrawerItem
            label="My Profile"
            focused={pathname === '/you'}
            activeBackgroundColor={props.activeBackgroundColor}
            activeTintColor={props.activeTintColor}
            inactiveTintColor={props.inactiveTintColor}
            labelStyle={[styles.drawerLabel, { color: pathname === '/you' ? props.activeTintColor : props.inactiveTintColor }]}

            onPress={() => router.push('/you')}
          />
          <DrawerItem
            label="Contact Us"
            focused={pathname === '/contact'}
            activeBackgroundColor={props.activeBackgroundColor}
            activeTintColor={props.activeTintColor}
            inactiveTintColor={props.inactiveTintColor}
            labelStyle={[styles.drawerLabel, { color: pathname === '/contact' ? props.activeTintColor : props.inactiveTintColor }]}

            onPress={() => router.push('/contact')}
          />
        </View>
      </DrawerContentScrollView>

      {session && (
        <View style={styles.footerContainer}>
          <DrawerItem
            label="SIGN OUT"
            labelStyle={styles.signOutLabel}
            icon={({ size }) => <Feather name="log-out" color="#ff3b30" size={size} />}
            onPress={signOut}
            style={styles.signOutDrawerItem}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    padding: 20,
    backgroundColor: '#000000',
    paddingTop: 50, 
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#cccccc',
    fontSize: 14,
    marginTop: 4,
  },
  signInText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 8,
    textDecorationLine: 'underline',
  },
  drawerItemsWrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 10,
  },
  drawerLabel: {
    marginLeft: 0,
    fontSize: 16,
  },
  footerContainer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  signOutDrawerItem: {
    marginVertical: 0,
  },
  signOutLabel: {
    fontWeight: 'bold',
    color: '#ff3b30',
    textTransform: 'uppercase',
  },
});
