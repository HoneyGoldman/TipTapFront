import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ConfigScreen() {
  return (
    <View style={styles.container}>
      <Text>Settings coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
});


