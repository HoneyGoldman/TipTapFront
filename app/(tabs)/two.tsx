import { useAuth } from '@/lib/auth';
import { router } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function TabTwoScreen() {
  const { setTokens, setUser } = useAuth();
  return (
    <View style={styles.container}>
      <Text>Coming soon...</Text>
      <Button title="Logout" onPress={async () => { await setTokens(null); await setUser(null); router.replace('/start'); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
});
