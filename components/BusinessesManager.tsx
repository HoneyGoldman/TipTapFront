import { BusinessCreate, BusinessOut, BusinessUpdate, addBusinessManager, createBusiness, deleteBusiness, listBusinesses, updateBusiness, uploadBusinessImages } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import 'expo-image-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function BusinessesManager() {
  const { user } = useAuth();
  const managerUserId = (user as any)?.id ?? 0;
  const queryClient = useQueryClient();
  const bizQuery = useQuery({ queryKey: ['businesses'], queryFn: () => listBusinesses(managerUserId) });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessOut | null>(null);

  const createMut = useMutation({
    mutationFn: (payload: BusinessCreate) => createBusiness(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['businesses'] }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: BusinessUpdate }) => updateBusiness(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['businesses'] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteBusiness(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['businesses'] }),
  });

  const onCreate = () => { setEditing(null); setEditorOpen(true); };
  const onEdit = (b: BusinessOut) => { setEditing(b); setEditorOpen(true); };

  const onSave = async (payload: BusinessCreate | BusinessUpdate) => {
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, payload: payload as BusinessUpdate });
      setEditorOpen(false);
      return;
    }
    const createPayload: BusinessCreate = {
      ...(payload as BusinessCreate),
      manager_user_ids: (payload as BusinessCreate).manager_user_ids?.length
        ? (payload as BusinessCreate).manager_user_ids
        : [managerUserId],
    };
    const created = await createMut.mutateAsync(createPayload);
    try {
      const images = (payload as BusinessCreate).images || [];
      if (images.length) {
        const files = images.map((uri) => ({ uri, name: 'image.jpg', type: 'image/jpeg' }));
        await uploadBusinessImages(created.id, files);
      }
    } finally {
      setEditorOpen(false);
    }
  };

  const onDelete = async (id: number) => {
    await deleteMut.mutateAsync(id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Your Businesses</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={onCreate}>
          <FontAwesome name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={bizQuery.data}
        keyExtractor={(b) => String(b.id)}
        refreshing={bizQuery.isFetching}
        onRefresh={() => bizQuery.refetch()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {!!item.images?.length && (
              <View style={{ marginBottom: 10 }}>
                <BusinessImagesCarousel images={item.images} />
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.dim}>{item.location}</Text>
                <View style={styles.chipsRow}>
                  <Badge icon="building" text={item.business_type} />
                  {!!item.menu_url && <Badge icon="link" text="Menu" color="#6366f1" />}
                  {!!item.manager_user_ids?.length && <Badge icon="users" text={`${item.manager_user_ids.length} managers`} color="#0ea5e9" />}
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <IconBtn icon="pencil" onPress={() => onEdit(item)} />
                <IconBtn icon="trash" color="#ff3b30" onPress={() => onDelete(item.id)} />
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text>{bizQuery.isLoading ? 'Loading...' : 'No businesses'}</Text>}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <BusinessEditorModal key={editing ? String(editing.id) : 'new'} visible={editorOpen} onClose={() => setEditorOpen(false)} onSave={onSave} biz={editing} requesterUserId={managerUserId} />
    </View>
  );
}

function toImagesList(input: any): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean);
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function BusinessImagesCarousel({ images, onRemove }: { images: string[] | string | undefined | null; onRemove?: (uri: string, index: number) => void }) {
  const safeImages = toImagesList(images);
  const [index, setIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const total = safeImages.length;
  const onNext = () => setIndex((prev) => (prev + 1) % total);
  const onPrev = () => setIndex((prev) => (prev - 1 + total) % total);
  if (!total) return null;
  const height = 220;
  return (
    <View onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      <ScrollView
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
        style={{ height, borderRadius: 12, overflow: 'hidden', backgroundColor: '#eee' }}
      >
        {safeImages.map((uri) => (
          <View key={uri} style={{ width: containerWidth || '100%', height }}>
            <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </View>
        ))}
      </ScrollView>
      <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: '#00000066', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>{index + 1} / {total}</Text>
      </View>
      {!!onRemove && total > 0 && (
        <View style={{ position: 'absolute', top: 8, right: 8 }}>
          <TouchableOpacity style={styles.carouselBtn} onPress={() => onRemove(safeImages[index], index)}>
            <FontAwesome name="trash" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      {total > 1 && (
        <View style={{ position: 'absolute', top: height * 0.4, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={onPrev} style={styles.carouselBtn}>
            <FontAwesome name="chevron-left" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onNext} style={styles.carouselBtn}>
            <FontAwesome name="chevron-right" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function Badge({ icon, text, color = '#0ea5e9' }: { icon: React.ComponentProps<typeof FontAwesome>['name']; text: string; color?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <FontAwesome name={icon} size={12} color="#fff" />
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

function IconBtn({ icon, onPress, color = '#0a7ea4' }: { icon: React.ComponentProps<typeof FontAwesome>['name']; onPress: () => void; color?: string }) {
  return (
    <TouchableOpacity style={styles.iconBtn} onPress={onPress}>
      <FontAwesome name={icon} size={16} color={color} />
    </TouchableOpacity>
  );
}

function BusinessEditorModal({ visible, onClose, onSave, biz, requesterUserId }: { visible: boolean; onClose: () => void; onSave: (p: BusinessCreate | BusinessUpdate & { requester_user_id?: number }) => void | Promise<void>; biz: BusinessOut | null; requesterUserId: number }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BusinessCreate | BusinessUpdate>(() => biz ? {
    name: biz.name,
    location: biz.location,
    business_type: biz.business_type,
    menu_url: biz.menu_url,
    images: biz.images,
    manager_user_ids: biz.manager_user_ids,
  } : {
    name: '',
    location: '',
    business_type: 'cafe',
    menu_url: '',
  });
  const [uploading, setUploading] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);
  const [managerEmail, setManagerEmail] = useState('');
  const [managerLoading, setManagerLoading] = useState(false);
  const [managerError, setManagerError] = useState<string | null>(null);
  const set = (patch: Partial<BusinessCreate & BusinessUpdate>) => setForm({ ...(form as any), ...(patch as any) });
  const pickImages = async () => {
    const media = (ImagePicker as any).MediaType?.Images ?? 'images';
    const res = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, mediaTypes: [media] as any, quality: 0.8 });
    if (res.canceled || !biz) return;
    setUploading(true);
    try {
      const files = res.assets.map((a) => ({ uri: a.uri, name: a.fileName ?? 'image.jpg', type: a.mimeType ?? 'image/jpeg' }));
      await uploadBusinessImages(biz.id, files);
      // Optimistic UI: append placeholders; list will refresh from query invalidation elsewhere
      const currentImages = ((form as any).images ?? biz.images ?? []) as string[];
      set({ images: [ ...currentImages, ...files.map((f) => f.uri) ] as any });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
    } finally {
      setUploading(false);
    }
  };
  const removeImage = async (uri: string, idx: number) => {
    if (!biz) return;
    setRemovingImage(true);
    try {
      const currentImages: string[] = toImagesList((form as any).images ?? biz.images);
      const next = currentImages.filter((_, i) => i !== idx);
      await updateBusiness(biz.id, { images: next });
      set({ images: next as any });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
    } finally {
      setRemovingImage(false);
    }
  };
  const addManager = async () => {
    if (!biz || !managerEmail) return;
    setManagerLoading(true);
    setManagerError(null);
    try {
      await addBusinessManager(biz.id, requesterUserId, managerEmail);
      setManagerEmail('');
    } catch (e: any) {
      setManagerError(e?.message ?? 'Failed to add manager');
    } finally {
      setManagerLoading(false);
    }
  };
  const submit = async () => {
    if (!('name' in form) || !('location' in form) || !('business_type' in form)) {}
    await onSave(form);
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{biz ? 'Edit Business' : 'Create Business'}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.link}>Close</Text></TouchableOpacity>
        </View>
        <ScrollView>
          <TextInput placeholder="Name" value={(form as any).name} onChangeText={(t) => set({ name: t })} style={styles.input} />
          <TextInput placeholder="Location" value={(form as any).location} onChangeText={(t) => set({ location: t })} style={styles.input} />
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.label}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectRow}>
              {(['bar','restaurant','cafe','hotel'] as const).map((t) => (
                <Pressable key={t} onPress={() => set({ business_type: t })} style={[styles.chip, (form as any).business_type === t && styles.chipActive]}>
                  <Text style={[styles.chipText, (form as any).business_type === t && styles.chipTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <TextInput placeholder="Menu URL (optional)" autoCapitalize="none" value={(form as any).menu_url ?? ''} onChangeText={(t) => set({ menu_url: t })} style={styles.input} />
          {!biz && (
            <TouchableOpacity style={[styles.secondaryBtn, { marginTop: 10 }]} onPress={async () => {
              const media = (ImagePicker as any).MediaType?.Images ?? 'images';
              const res = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, mediaTypes: [media] as any, quality: 0.8 });
              if (res.canceled) return;
              const uris = res.assets.map((a) => a.uri);
              set({ images: uris as any });
            }}>
              <Text style={styles.secondaryBtnText}>Add images</Text>
            </TouchableOpacity>
          )}
          {!!biz && (
            <View style={{ marginTop: 8 }}>
              <BusinessImagesCarousel images={((form as any).images ?? biz?.images ?? []) as string[]} onRemove={removeImage} />
            </View>
          )}
          {!!biz && (
            <TouchableOpacity style={[styles.secondaryBtn, { marginTop: 10 }]} onPress={pickImages} disabled={uploading}>
              <Text style={styles.secondaryBtnText}>{uploading ? 'Uploading…' : 'Add images'}</Text>
            </TouchableOpacity>
          )}
          {!!biz && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.label}>Add manager</Text>
              <TextInput placeholder="Manager email" autoCapitalize="none" keyboardType="email-address" value={managerEmail} onChangeText={setManagerEmail} style={styles.input} />
              {!!managerError && <Text style={{ color: '#ef4444', marginBottom: 8 }}>{managerError}</Text>}
              <TouchableOpacity style={[styles.primaryBtn, managerLoading && { opacity: 0.7 }]} onPress={addManager} disabled={managerLoading}>
                <Text style={styles.primaryBtnText}>{managerLoading ? 'Adding…' : 'Add manager'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 8 }]} onPress={submit}>
          <Text style={styles.primaryBtnText}>{biz ? 'Save Changes' : 'Create Business'}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function AddManagerModal({ visible, onClose, biz, requesterUserId }: { visible: boolean; onClose: () => void; biz: BusinessOut | null; requesterUserId: number }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const placeholder = 'Manager email';
  const onInvite = async () => {
    if (!biz || !value) return;
    setLoading(true);
    setError(null);
    try {
      await addBusinessManager(biz.id, requesterUserId, value);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to add manager');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <Text style={[styles.modalTitle, { marginBottom: 10 }]}>Add manager to {biz?.name}</Text>
          <TextInput placeholder={placeholder} autoCapitalize="none" keyboardType="email-address" value={value} onChangeText={setValue} style={styles.input} />
          {!!error && <Text style={{ color: '#ef4444', marginBottom: 8 }}>{error}</Text>}
          <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.7 }]} onPress={onInvite} disabled={loading}>
            <Text style={styles.primaryBtnText}>{loading ? 'Sending...' : 'Add Manager'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 8 }} onPress={onClose}><Text style={styles.link}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800' },
  primaryBtn: { backgroundColor: '#0a7ea4', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 14, marginBottom: 12, backgroundColor: '#fff' },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  dim: { color: '#666' },
  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  badge: { flexDirection: 'row', gap: 6, backgroundColor: '#0ea5e9', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, alignItems: 'center' },
  badgeText: { color: '#fff', fontWeight: '700' },
  iconBtn: { backgroundColor: '#f2f7fb', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, marginBottom: 8 },
  label: { fontSize: 12, color: '#555', marginBottom: 4 },
  selectRow: { gap: 6, alignItems: 'center' },
  chip: { borderWidth: 1, borderColor: '#ccc', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  chipActive: { backgroundColor: '#0a7ea4', borderColor: '#0a7ea4' },
  chipText: { color: '#333', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  modalWrap: { flex: 1, padding: 16, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  link: { color: '#0a7ea4', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#f2f2f2', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  secondaryBtnText: { color: '#333', fontWeight: '700' },
  thumb: { width: 64, height: 48, borderRadius: 8, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  carouselBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
});


