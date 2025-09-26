import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import Colors from '@/constants/Colors';

export default function StartScreen() {
  return (
    <View style={styles.container}>
      {/* <Image source={require('../assets/images/icon.png')} style={{ width: 96, height: 96, marginBottom: 24 }} /> */}
      <Text style={styles.title}>TipTap</Text>
      <Text style={styles.subtitle}>Swipe your way to the perfect job</Text>
      <View style={{ height: 24 }} />
      <Text style={styles.subtitle}>Get Started</Text>
      <Link href="/auth/login" asChild>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </TouchableOpacity>
      </Link>
      <View style={{ height: 12 }} />
      <Link href="/auth/signup" asChild>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Sign Up</Text>
        </TouchableOpacity>
      </Link>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 50, fontWeight: '800', color: Colors.blue.text, marginBottom: 24 },
  subtitle: { fontSize: 30, color: '#666', marginBottom: 24, marginTop: 40, textAlign: 'center' },
  primaryButton: {
    backgroundColor: '#0000CD',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '60%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});


