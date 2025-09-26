import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Platform } from 'react-native';
import { registerManager, registerWaiter } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { router } from 'expo-router';

export default function SignupScreen() {
  const { setTokens, setUser } = useAuth();
  const [role, setRole] = useState<'employer' | 'employee'>('employee');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessLocation, setBusinessLocation] = useState('');
  const [businessType, setBusinessType] = useState<'bar' | 'restaurant' | 'cafe' | 'hotel'>('cafe');
  const [menuUrl, setMenuUrl] = useState(Platform.select({ web: window.location.origin + '/menu.pdf', default: 'https://example.com/menu.pdf' })!);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (role === 'employer') {
        const tokens = await registerManager({
          display_name: displayName || 'Manager',
          email,
          password,
          business_name: businessName || 'Business',
          business_location: businessLocation || 'City',
          business_type: businessType,
          menu_url: menuUrl,
        });
        await setTokens(tokens);
        await setUser({ email, role: 'employer' });
      } else {
        const tokens = await registerWaiter({ email, password });
        await setTokens(tokens);
        await setUser({ email, role: 'employee' });
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
      <View style={styles.row}>
        <Button title={role === 'employee' ? 'Employee ✓' : 'Employee'} onPress={() => setRole('employee')} />
        <View style={{ width: 12 }} />
        <Button title={role === 'employer' ? 'Employer ✓' : 'Employer'} onPress={() => setRole('employer')} />
      </View>
      <TextInput placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
      {role === 'employer' && (
        <>
          <TextInput placeholder="Display Name" value={displayName} onChangeText={setDisplayName} style={styles.input} />
          <TextInput placeholder="Business Name" value={businessName} onChangeText={setBusinessName} style={styles.input} />
          <TextInput placeholder="Business Location" value={businessLocation} onChangeText={setBusinessLocation} style={styles.input} />
          <TextInput placeholder="Business Type (bar/restaurant/cafe/hotel)" value={businessType} onChangeText={(t) => setBusinessType(t as any)} style={styles.input} />
          <TextInput placeholder="Menu URL" value={menuUrl} onChangeText={setMenuUrl} style={styles.input} />
        </>
      )}
      <Button title={loading ? 'Creating...' : 'Create Account'} onPress={onSubmit} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12 },
  error: { color: 'red', marginBottom: 12 },
  row: { flexDirection: 'row', marginBottom: 12 },
});


