import { Redirect } from 'expo-router';
import { useSession } from '../context/SessionProvider';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export default function Index() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
