import { getBusinessById, likeRole, listNearbyRoles, listRoles, type BusinessOut, type RoleOut } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import React, { useMemo, useRef, useState } from 'react';
import { Dimensions, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolate, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

export default function TabOneScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const rolesQuery = useQuery({
    queryKey: ['roles_feed'],
    queryFn: async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') return await listRoles();
        const pos = await Location.getCurrentPositionAsync({});
        const userId = (user as any)?.id ?? 0;
        if (!userId) return await listRoles();
        return await listNearbyRoles(userId, pos.coords.latitude, pos.coords.longitude, undefined);
      } catch {
        return await listRoles();
      }
    },
  });
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
  const biz = useQuery({ queryKey: ['business', role.business_id], queryFn: () => getBusinessById(role.business_id) });
  const images = (biz.data as any as BusinessOut | undefined)?.images ?? [];
  const businessName = (biz.data as any as BusinessOut | undefined)?.name;
  const businessType = (biz.data as any as BusinessOut | undefined)?.business_type;
  const menuUrl = (biz.data as any as BusinessOut | undefined)?.menu_url;
  const location = (biz.data as any as BusinessOut | undefined)?.location ?? role.location;
  return (
    <View style={styles.card}>
      {!!images.length && <ImagesCarousel images={images} />}
      {!!businessName && (
        <View style={{ marginBottom: 6 }}>
          <Text style={{ fontSize: 16, fontWeight: '800' }}>{businessName}</Text>
          <View style={styles.rowChips}>
            {!!businessType && <Chip label={titleCase(businessType)} />}
            {!!menuUrl && <Chip label="Menu" />}
          </View>
        </View>
      )}
      <Text style={styles.cardTitle}>{titleCase(role.position)} • ₪{role.payment_per_hour}/h</Text>
      <Text style={styles.dim}>{location}</Text>
      <View style={styles.rowChips}>
        <Chip label={titleCase(role.when_need)} />
        <Chip label={prettyExperience(role.experience_required)} />
        {role.shift_morning && <Chip label="Morning" />}
        {role.shift_evening && <Chip label="Evening" />}
        {role.shift_weekends && <Chip label="Weekends" />}
        {role.shift_full_time && <Chip label="Full-time" />}
        {role.shift_part_time && <Chip label="Part-time" />}
      </View>
      {!!role.about_job && <Text numberOfLines={6}>{role.about_job}</Text>}
    </View>
  );
}

function ImagesCarousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const scroller = useRef<ScrollView | null>(null);
  const total = images.length;
  const height = 220;
  if (!total) return null;
  const advance = () => {
    if (!containerWidth) return;
    const next = (index + 1) % total;
    setIndex(next);
    scroller.current?.scrollTo({ x: next * containerWidth, animated: true });
  };
  return (
    <Pressable onPress={advance}>
      <View onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          snapToInterval={containerWidth || undefined}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const width = containerWidth || e.nativeEvent.layoutMeasurement.width;
            const x = e.nativeEvent.contentOffset.x;
            const idx = Math.round(x / width);
            if (!Number.isNaN(idx)) setIndex(Math.min(Math.max(idx, 0), total - 1));
          }}
          style={{ height, borderRadius: 12, overflow: 'hidden', backgroundColor: '#eee', marginBottom: 10 }}
        >
          {images.map((uri) => (
            <View key={uri} style={{ width: containerWidth || '100%', height }}>
              <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
          ))}
        </ScrollView>
        <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: '#00000066', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{index + 1} / {total}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function titleCase(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function prettyExperience(s: RoleOut['experience_required']) {
  switch (s) {
    case 'no_experience': return 'No experience';
    case 'some_experience': return 'Some experience';
    case 'experience_only': return 'Experience only';
    default: return titleCase(String(s));
  }
}
function Chip({ label }: { label: string }) {
  return <View style={styles.badge}><Text style={styles.badgeText}>{label}</Text></View>;
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
  dim: { color: '#666', marginBottom: 6 },
  rowChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  badge: { flexDirection: 'row', gap: 6, backgroundColor: '#0ea5e9', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, alignItems: 'center' },
  badgeText: { color: '#fff', fontWeight: '700' },
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
