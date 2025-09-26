import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteNotification, listNotifications, markNotificationRead, type NotificationOut } from '@/lib/api';

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['notifications'], queryFn: listNotifications });
  const markRead = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteNotification(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      <FlatList
        data={query.data}
        keyExtractor={(n) => String(n.id)}
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
        renderItem={({ item }) => (
          <NotificationItem
            n={item}
            onMarkRead={() => markRead.mutate(item.id)}
            onDelete={() => remove.mutate(item.id)}
          />
        )}
        ListEmptyComponent={<Text>{query.isLoading ? 'Loading...' : 'No notifications'}</Text>}
      />
    </View>
  );
}

function NotificationItem({ n, onMarkRead, onDelete }: { n: NotificationOut; onMarkRead: () => void; onDelete: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{n.type}</Text>
      <Text>{JSON.stringify(n.payload)}</Text>
      <View style={styles.row}>
        <TouchableOpacity onPress={onMarkRead}><Text style={styles.link}>Mark read</Text></TouchableOpacity>
        <TouchableOpacity onPress={onDelete}><Text style={styles.link}>Delete</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  card: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  link: { color: '#0a7ea4', fontWeight: '600' },
});


