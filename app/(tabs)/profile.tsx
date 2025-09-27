import { listBusinesses, type BusinessOut } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const { setTokens, setUser, user } = useAuth();
  const bizQuery = useQuery({ queryKey: ['businesses'], queryFn: listBusinesses });

  const initials = (user?.display_name || user?.email || '?')
    .split(' ')
    .map((s) => s.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <ScrollView style={{...styles.container, paddingHorizontal: 12, marginTop: 15}} contentContainerStyle={styles.scrollContent}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <Text style={styles.name}>{user?.display_name || 'User'}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <FontAwesome name={user?.user_type === 'business_manager' ? 'briefcase' : 'user'} size={12} color="#fff" />
              <Text style={styles.badgeText}>{user?.user_type === 'business_manager' ? 'Manager' : 'Waiter'}</Text>
            </View>
            {(user?.is_active ?? true) ? (
              <View style={[styles.badge, { backgroundColor: '#16a34a' }]}>
                <FontAwesome name="check" size={12} color="#fff" />
                <Text style={styles.badgeText}>Active</Text>
              </View>
            ) : (
              <View style={[styles.badge, { backgroundColor: '#ef4444' }]}>
                <FontAwesome name="times" size={12} color="#fff" />
                <Text style={styles.badgeText}>Inactive</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>
        {!!user?.display_name && (
          <>
            <View style={styles.divider} />
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Display name</Text>
              <Text style={styles.value}>{user?.display_name}</Text>
            </View>
          </>
        )}
      </View>

      {/* Businesses moved to Settings (Config) tab */}

      <View style={{ marginTop: 16, alignItems: 'flex-end' }}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
          onPress={async () => { await setTokens(null); await setUser(null); router.replace('/start'); }}
        >
          <FontAwesome name="sign-out" size={16} color="#fff" />
          <Text style={[styles.actionText, { color: '#fff' }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function BusinessCard({ biz }: { biz: BusinessOut }) {
  return (
    <View style={styles.bizRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.bizName}>{biz.name}</Text>
        <Text style={styles.dim}>{biz.location}</Text>
        <View style={styles.chipsRow}>
          <View style={[styles.badge, { backgroundColor: '#0ea5e9' }]}>
            <FontAwesome name="building" size={12} color="#fff" />
            <Text style={styles.badgeText}>{biz.business_type}</Text>
          </View>
          {!!biz.menu_url && (
            <View style={[styles.badge, { backgroundColor: '#6366f1' }]}>
              <FontAwesome name="link" size={12} color="#fff" />
              <Text style={styles.badgeText}>Menu</Text>
            </View>
          )}
        </View>
        {!!biz.manager_user_ids?.length && (
          <Text style={[styles.dim, { marginTop: 6 }]}>Managers: {biz.manager_user_ids.join(', ')}</Text>
        )}
        {!!biz.images?.length && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {biz.images.slice(0, 3).map((src, i) => (
              <View key={src + i} style={{ width: 64, height: 48, borderRadius: 8, overflow: 'hidden', backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {/* In Expo RN, we can use Image component */}
                {/* @ts-ignore */}
                <FontAwesome name="image" size={18} color="#888" />
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
        <Text style={styles.dim}>ID #{biz.id}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  hero: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#0a7ea4', borderRadius: 16 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#ffffff22', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  name: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 6 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  badge: { flexDirection: 'row', gap: 6, backgroundColor: '#0ea5e9', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, alignItems: 'center' },
  badgeText: { color: '#fff', fontWeight: '700' },
  card: { marginTop: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#eee' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: '#666' },
  value: { color: '#111', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10 },
  actionText: { color: '#0a7ea4', fontWeight: '700' },
  dim: { color: '#666' },
  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  bizRow: { flexDirection: 'row', gap: 12 },
  bizName: { fontSize: 16, fontWeight: '800' },
});


