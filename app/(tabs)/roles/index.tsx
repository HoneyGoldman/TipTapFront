import { useAuth } from '@/lib/auth';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useEffect } from 'react';

export const options = {
  title: 'Roles',
  tabBarIcon: ({ color }: { color: string }) => (
    <FontAwesome name="briefcase" size={28} color={color} style={{ marginBottom: -3 }} />
  ),
};

export default function RolesIndexRedirect() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (user.user_type === 'business_manager') {
      router.replace('/(tabs)/roles/manager');
    } else {
      router.replace('/(tabs)/roles/waiter');
    }
  }, [user]);

  return null;
}


