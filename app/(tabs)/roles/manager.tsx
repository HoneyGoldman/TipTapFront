import RolesManager from '@/components/RolesManager';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';

export const options = {
  title: 'Roles',
  tabBarIcon: ({ color }: { color: string }) => (
    <FontAwesome name="briefcase" size={28} color={color} style={{ marginBottom: -3 }} />
  ),
};

export default function ManagerRolesScreen() {
  return <RolesManager />;
}


