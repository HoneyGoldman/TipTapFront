import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { listConversations } from '@/lib/api';

export default function ChatScreen() {
  const query = useQuery({ queryKey: ['conversations'], queryFn: listConversations });
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat</Text>
      <FlatList
        data={query.data}
        keyExtractor={(c) => String(c.id)}
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Conversation #{item.id}</Text>
            <Text>Participants: {item.participant_user_ids.join(', ')}</Text>
          </View>
        )}
        ListEmptyComponent={<Text>{query.isLoading ? 'Loading...' : 'No conversations yet'}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  card: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
});


