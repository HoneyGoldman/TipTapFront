import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/lib/auth';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user, isHydrating } = useAuth();

  if (isHydrating || !user) return null;

  const managerScreens = [
    // Hide waiter-only screen
    <Tabs.Screen key="index-hidden" name="index" options={{ href: null }} />,
    <Tabs.Screen
      key="roles"
      name="roles"
      options={{
        title: 'Roles',
        tabBarIcon: ({ color }) => <TabBarIcon name="briefcase" color={color} />,
      }}
    />,
    <Tabs.Screen
      key="notifications"
      name="notifications"
      options={{
        title: 'Notifications',
        tabBarIcon: ({ color }) => <TabBarIcon name="bell" color={color} />,
      }}
    />,
    <Tabs.Screen
      key="chat"
      name="chat"
      options={{
        title: 'Chat',
        tabBarIcon: ({ color }) => <TabBarIcon name="comments" color={color} />,
      }}
    />,
    <Tabs.Screen
      key="config"
      name="config"
      options={{
        title: 'Config',
        tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
      }}
    />,
    <Tabs.Screen
      key="two"
      name="two"
      options={{
        title: 'Profile',
        tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
      }}
    />,
  ];

  const waiterScreens = [
    // Hide manager-only screen
    <Tabs.Screen key="roles-hidden" name="roles" options={{ href: null }} />,
    <Tabs.Screen
      key="index"
      name="index"
      options={{
        title: 'Jobs',
        tabBarIcon: ({ color }) => <TabBarIcon name="briefcase" color={color} />,
        headerRight: () => (
          <Link href="/modal" asChild>
            <Pressable>
              {({ pressed }) => (
                <FontAwesome
                  name="info-circle"
                  size={25}
                  color={Colors[colorScheme ?? 'light'].text}
                  style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                />
              )}
            </Pressable>
          </Link>
        ),
      }}
    />,
    <Tabs.Screen
      key="chat"
      name="chat"
      options={{
        title: 'Chat',
        tabBarIcon: ({ color }) => <TabBarIcon name="comments" color={color} />,
      }}
    />,
    <Tabs.Screen
      key="notifications"
      name="notifications"
      options={{
        title: 'Notifications',
        tabBarIcon: ({ color }) => <TabBarIcon name="bell" color={color} />,
      }}
    />,
    <Tabs.Screen
      key="config"
      name="config"
      options={{
        title: 'Config',
        tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
      }}
    />,
    <Tabs.Screen
      key="two"
      name="two"
      options={{
        title: 'Profile',
        tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
      }}
    />,
  ];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarShowLabel: false,
        headerTitle: '',
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: false,
      }}
    >
      {(user?.user_type === 'business_manager' ? managerScreens : waiterScreens)}
    </Tabs>
  );
}
