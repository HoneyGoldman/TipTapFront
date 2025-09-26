import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { likeRole, listRoles, type RoleOut } from '@/lib/api';

export default function TabOneScreen() {
  const queryClient = useQueryClient();
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: listRoles });
  const likeMut = useMutation({
    mutationFn: (id: number) => likeRole(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Jobs</Text>
      <FlatList
        data={rolesQuery.data}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={rolesQuery.isFetching} onRefresh={() => rolesQuery.refetch()} />}
        renderItem={({ item }) => <RoleItem role={item} onLike={() => likeMut.mutate(item.id)} />}
        ListEmptyComponent={<Text>{rolesQuery.isLoading ? 'Loading...' : 'No roles yet'}</Text>}
      />
    </View>
  );
}

function RoleItem({ role, onLike }: { role: RoleOut; onLike: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{role.position} • ₪{role.payment_per_hour}/h</Text>
      <Text>{role.location}</Text>
      <Text>{role.about_job}</Text>
      <View style={{ height: 8 }} />
      <Text style={styles.like} onPress={onLike}>Like</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  card: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  like: { color: '#0a7ea4', fontWeight: '600' },
});
