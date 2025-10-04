import BusinessesManager from '@/components/BusinessesManager';
import WaiterSettings from '@/components/WaiterSettings';
import { useAuth } from '@/lib/auth';
import React from 'react';

export default function ConfigScreen() {
  const { user } = useAuth();
  if (user?.user_type === 'business_manager') {
    return <BusinessesManager />;
  }
  return <WaiterSettings />;
}

const styles = {} as any;


