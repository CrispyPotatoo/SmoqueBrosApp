import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerTransparent: false }}>
      <Stack.Screen name="index" options={{ title: 'Login' }} />
      <Stack.Screen name="signup" options={{ title: 'Create Account' }} />
      <Stack.Screen name="verify-email" options={{ title: 'Verify Email' }} />
    </Stack>
  );
}
