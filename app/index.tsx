import React, { useEffect } from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function Index() {
  const { accessToken, isHydrating, user } = useAuth();

  useEffect(() => {
    if (isHydrating) return;
    if (accessToken && user) router.replace('/(tabs)');
    else router.replace('/start');
  }, [accessToken, user, isHydrating]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
      <Text>Loading...</Text>
    </View>
  );
}


