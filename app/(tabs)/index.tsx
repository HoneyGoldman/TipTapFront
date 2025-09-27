import { likeRole, listRoles, type RoleOut } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolate, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

export default function TabOneScreen() {
  const queryClient = useQueryClient();
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: listRoles });
  const likeMut = useMutation({
    mutationFn: (id: number) => likeRole(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const roles = rolesQuery.data ?? [];

  const handleSwipeRight = (roleId: number) => {
    likeMut.mutate(roleId);
  };

  const onRefresh = () => rolesQuery.refetch();

  const hasCards = roles.length > 0 && currentIndex < roles.length;

  return (
    <View style={styles.container}>
      {!hasCards && (
        <ScrollView refreshControl={<RefreshControl refreshing={rolesQuery.isFetching} onRefresh={onRefresh} />}>
          <Text>{rolesQuery.isLoading ? 'Loading...' : 'No roles yet'}</Text>
        </ScrollView>
      )}
      {hasCards && (
        <SwipeDeck
          roles={roles}
          startIndex={currentIndex}
          onAdvance={(nextIndex) => setCurrentIndex(nextIndex)}
          onSwipeRight={handleSwipeRight}
        />
      )}
    </View>
  );
}

function RoleCard({ role }: { role: RoleOut }) {
  return (
    <View style={styles.card}> 
      <Text style={styles.cardTitle}>{role.position} • ₪{role.payment_per_hour}/h</Text>
      <Text>{role.location}</Text>
      <Text numberOfLines={6}>{role.about_job}</Text>
    </View>
  );
}

function SwipeDeck({
  roles,
  startIndex,
  onAdvance,
  onSwipeRight,
}: {
  roles: RoleOut[];
  startIndex: number;
  onAdvance: (nextIndex: number) => void;
  onSwipeRight: (roleId: number) => void;
}) {
  const screen = Dimensions.get('window');
  const activeIndex = useSharedValue(startIndex);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const rotationDegrees = useMemo(() => 12, []);
  const swipeThresholdX = useMemo(() => screen.width * 0.28, [screen.width]);

  const pan = Gesture.Pan()
    .onUpdate((e: { translationX: number; translationY: number }) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      const shouldAccept = translateX.value > swipeThresholdX;
      const shouldReject = translateX.value < -swipeThresholdX;
      if (shouldAccept || shouldReject) {
        const exitX = shouldAccept ? screen.width * 1.2 : -screen.width * 1.2;
        translateX.value = withTiming(exitX, { duration: 220 }, () => {
          const next = activeIndex.value + 1;
          activeIndex.value = next;
          translateX.value = 0;
          translateY.value = 0;
          if (shouldAccept) {
            const role = roles[next - 1];
            if (role) {
              runOnJS(onSwipeRight)(role.id);
            }
          }
          runOnJS(onAdvance)(next);
        });
        translateY.value = withTiming(0, { duration: 220 });
        return;
      }
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const topCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-screen.width, 0, screen.width],
      [-rotationDegrees, 0, rotationDegrees],
      Extrapolate.CLAMP
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    } as const;
  });

  const likeOpacity = useAnimatedStyle(() => {
    return {
      opacity: interpolate(translateX.value, [swipeThresholdX * 0.5, swipeThresholdX], [0, 1], Extrapolate.CLAMP),
    } as const;
  });

  const nopeOpacity = useAnimatedStyle(() => {
    return {
      opacity: interpolate(translateX.value, [-swipeThresholdX, -swipeThresholdX * 0.5], [1, 0], Extrapolate.CLAMP),
    } as const;
  });

  const stack = useMemo(() => {
    const from = startIndex;
    const to = Math.min(roles.length, startIndex + 3);
    return roles.slice(from, to).map((item, i) => ({ item, position: i }));
  }, [roles, startIndex]);

  return (
    <View style={styles.deckArea}>
      {stack.map(({ item, position }, idx) => {
        const isTop = position === 0;
        const zIndex = 100 - idx;
        const offsetStyle = isTop
          ? topCardStyle
          : {
              transform: [
                { translateY: (position) * 10 },
                { scale: 1 - position * 0.04 },
              ],
            } as any;
        const content = (
          <Animated.View key={item.id} style={[styles.cardWrap, { zIndex }, offsetStyle]}>
            <RoleCard role={item} />
            {isTop && (
              <>
                <Animated.Text style={[styles.likeBadge, likeOpacity]}>LIKE</Animated.Text>
                <Animated.Text style={[styles.nopeBadge, nopeOpacity]}>NOPE</Animated.Text>
              </>
            )}
          </Animated.View>
        );
        return isTop ? (
          <GestureDetector key={item.id} gesture={pan}>
            {content}
          </GestureDetector>
        ) : (
          content
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  deckArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardWrap: { position: 'absolute', width: '100%' },
  card: { borderWidth: 1, borderColor: '#ddd', padding: 16, borderRadius: 16, backgroundColor: '#fff' },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  likeBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    color: '#1db954',
    fontSize: 24,
    fontWeight: '900',
  },
  nopeBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    color: '#ff3b30',
    fontSize: 24,
    fontWeight: '900',
  },
});
