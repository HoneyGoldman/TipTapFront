import { registerManagerBasic, registerWaiter } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SignupScreen() {
  const { setTokens, setUser } = useAuth();
  const [role, setRole] = useState<'manager' | 'waiter'>('waiter');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (role === 'manager') {
        const tokens = await registerManagerBasic({
          display_name: displayName || 'Manager',
          email,
          password,
        });
        await setTokens(tokens);
        await setUser(tokens.user_entity);
      } else {
        const tokens = await registerWaiter({ email, password, display_name: displayName || 'Waiter' });
        await setTokens(tokens);
        await setUser(tokens.user_entity);
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.segment}>
        <TouchableOpacity style={[styles.segmentBtn, role === 'waiter' && styles.segmentBtnActive]} onPress={() => setRole('waiter')}>
          <Text style={[styles.segmentText, role === 'waiter' && styles.segmentTextActive]}>Waiter</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segmentBtn, role === 'manager' && styles.segmentBtnActive]} onPress={() => setRole('manager')}>
          <Text style={[styles.segmentText, role === 'manager' && styles.segmentTextActive]}>Manager</Text>
        </TouchableOpacity>
      </View>

      {role === 'manager' && (
        <TextInput placeholder="Display Name" value={displayName} onChangeText={setDisplayName} style={styles.input} />
      )}
      <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />

      <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.7 }]} onPress={onSubmit} disabled={loading}>
        <Text style={styles.primaryBtnText}>{loading ? 'Creating...' : 'Create Account'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, marginBottom: 12 },
  error: { color: '#ef4444', marginBottom: 12, textAlign: 'center' },
  segment: { flexDirection: 'row', backgroundColor: '#f2f2f2', borderRadius: 999, padding: 4, marginBottom: 16, alignSelf: 'center' },
  segmentBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999 },
  segmentBtnActive: { backgroundColor: '#0a7ea4' },
  segmentText: { color: '#333', fontWeight: '700' },
  segmentTextActive: { color: '#fff' },
  primaryBtn: { backgroundColor: '#0a7ea4', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});


