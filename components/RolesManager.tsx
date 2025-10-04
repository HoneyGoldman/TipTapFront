import { BusinessOut, RoleCreate, RoleOut, RoleUpdate, createRole, deleteRole, listBusinesses, listRoles, updateRole } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Slider from '@react-native-community/slider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const POSITIONS: RoleOut['position'][] = ['waiter', 'bartender', 'barista', 'hostess', 'shift_manager'];
const WHEN_NEED: RoleOut['when_need'][] = ['this_week', 'always_looking'];
const EXPERIENCE: RoleOut['experience_required'][] = ['no_experience', 'some_experience', 'experience_only'];

type Filters = {
  position?: RoleOut['position'] | '';
  when_need?: RoleOut['when_need'] | '';
  experience_required?: RoleOut['experience_required'] | '';
  shift_morning?: boolean;
  shift_evening?: boolean;
  shift_weekends?: boolean;
  shift_full_time?: boolean;
  shift_part_time?: boolean;
  is_active?: boolean;
  location_query?: string;
  min_wage_at_least?: string;
  business_id?: number | '';
};

export default function RolesManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>({ is_active: true });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<RoleOut | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const businessesQuery = useQuery({ queryKey: ['businesses'], queryFn: listBusinesses });
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: listRoles });

  const businesses = businessesQuery.data ?? [];
  const managerBusinessIds = useMemo(() => {
    // In this app, the API returns only businesses the current manager owns
    return businesses.map((b) => b.id);
  }, [businesses]);

  const visibleRoles = useMemo(() => {
    const all = (rolesQuery.data ?? []).filter((r) => managerBusinessIds.includes(r.business_id));
    const sorted = [...all].sort((a, b) => {
      const ta = a.created_at ? Date.parse(a.created_at) : 0;
      const tb = b.created_at ? Date.parse(b.created_at) : 0;
      if (tb !== ta) return tb - ta; // newer first
      return (b.id ?? 0) - (a.id ?? 0);
    });
    return sorted.filter((r) => {
      if (filters.is_active !== undefined && filters.is_active !== null) {
        if ((r.is_active ?? true) !== filters.is_active) return false;
      }
      if (filters.business_id && r.business_id !== filters.business_id) return false;
      if (filters.position && r.position !== filters.position) return false;
      if (filters.when_need && r.when_need !== filters.when_need) return false;
      if (filters.experience_required && r.experience_required !== filters.experience_required) return false;
      if (filters.shift_morning && !r.shift_morning) return false;
      if (filters.shift_evening && !r.shift_evening) return false;
      if (filters.shift_weekends && !r.shift_weekends) return false;
      if (filters.shift_full_time && !r.shift_full_time) return false;
      if (filters.shift_part_time && !r.shift_part_time) return false;
      if (filters.location_query && !r.location.toLowerCase().includes(filters.location_query.toLowerCase())) return false;
      if (filters.min_wage_at_least) {
        const min = Number(filters.min_wage_at_least);
        if (!Number.isNaN(min) && (r.payment_per_hour ?? 0) < min) return false;
      }
      return true;
    });
  }, [rolesQuery.data, managerBusinessIds, filters]);

  const createMut = useMutation({
    mutationFn: (payload: RoleCreate) => createRole(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RoleUpdate }) => updateRole(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (r: RoleOut) => {
    setEditing(r);
    setEditorOpen(true);
  };

  const onSave = async (payload: RoleCreate | RoleUpdate) => {
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, payload: payload as RoleUpdate });
    } else {
      await createMut.mutateAsync(payload as RoleCreate);
    }
    setEditorOpen(false);
  };

  const onDelete = async (id: number) => {
    await deleteMut.mutateAsync(id);
  };

  const isManager = user?.user_type === 'business_manager';
  if (!isManager) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Not authorized</Text>
      </View>
    );
  }

  return (
    <View style={{...styles.container, paddingHorizontal: 12, marginTop:15}}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Your Roles</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => setShowFilters((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={showFilters ? 'Hide filters' : 'Show filters'}
          >
            <FontAwesome name="sliders" size={18} color={showFilters ? '#fff' : '#333'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={openCreate}
            accessibilityRole="button"
            accessibilityLabel="Create new role"
          >
            <FontAwesome name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      {showFilters && (
        <FiltersBar
          filters={filters}
          onChange={setFilters}
          businesses={businesses}
        />
      )}
      <FlatList
        data={visibleRoles}
        keyExtractor={(r) => String(r.id)}
        refreshing={rolesQuery.isFetching}
        onRefresh={() => rolesQuery.refetch()}
        renderItem={({ item }) => (
          <RoleCard role={item} onEdit={() => openEdit(item)} onDelete={() => onDelete(item.id)} />
        )}
        ListEmptyComponent={<Text>{rolesQuery.isLoading ? 'Loading...' : 'No roles found'}</Text>}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <RoleEditorModal
        visible={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={onSave}
        role={editing}
        businesses={businesses}
        defaultBusinessId={filters.business_id || managerBusinessIds[0]}
        mapPickerOpen={mapPickerOpen}
        setMapPickerOpen={setMapPickerOpen}
      />
    </View>
  );
}

function MapPickerModal({ visible, onClose, initial, onPick }: { visible: boolean; onClose: () => void; initial: { latitude: number; longitude: number }; onPick: (coords: { latitude: number; longitude: number }) => void }) {
  const [coord, setCoord] = useState<{ latitude: number; longitude: number }>(initial);
  const region = { latitude: coord.latitude, longitude: coord.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 } as const;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <MapView style={{ flex: 1 }} initialRegion={region} onPress={(e) => setCoord(e.nativeEvent.coordinate)}>
          <Marker coordinate={coord} />
        </MapView>
        <View style={{ position: 'absolute', top: 50, right: 16, backgroundColor: '#00000066', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{coord.latitude.toFixed(5)}, {coord.longitude.toFixed(5)}</Text>
        </View>
        <View style={{ padding: 12, backgroundColor: '#fff' }}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => onPick(coord)}>
            <Text style={styles.primaryBtnText}>Use this location</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 8 }} onPress={onClose}><Text style={styles.link}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function FiltersBar({ filters, onChange, businesses }: { filters: Filters; onChange: (f: Filters) => void; businesses: BusinessOut[] }) {
  return (
    <View style={styles.filters}>
      <View style={styles.filtersCol}>
        <Select
          label="Business"
          value={String(filters.business_id ?? '')}
          options={[{ label: 'All', value: '' }, ...businesses.map((b) => ({ label: b.name, value: String(b.id) }))]}
          onChange={(v) => onChange({ ...filters, business_id: v ? Number(v) : '' })}
        />
        <Select
          label="Position"
          value={filters.position ?? ''}
          options={[{ label: 'Any', value: '' }, ...POSITIONS.map((p) => ({ label: titleCase(p), value: p }))]}
          onChange={(v) => onChange({ ...filters, position: (v as any) || '' })}
        />
        <Select
          label="When"
          value={filters.when_need ?? ''}
          options={[{ label: 'Any', value: '' }, ...WHEN_NEED.map((p) => ({ label: titleCase(p), value: p }))]}
          onChange={(v) => onChange({ ...filters, when_need: (v as any) || '' })}
        />
        <Select
          label="Experience"
          value={filters.experience_required ?? ''}
          options={[{ label: 'Any', value: '' }, ...EXPERIENCE.map((p) => ({ label: prettyExperience(p), value: p }))]}
          onChange={(v) => onChange({ ...filters, experience_required: (v as any) || '' })}
        />
        <View>
          <Text style={styles.label}>Hours</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectRow}>
            <ChipToggle label="Morning" value={!!filters.shift_morning} onChange={(v) => onChange({ ...filters, shift_morning: v })} />
            <ChipToggle label="Evening" value={!!filters.shift_evening} onChange={(v) => onChange({ ...filters, shift_evening: v })} />
            <ChipToggle label="Weekends" value={!!filters.shift_weekends} onChange={(v) => onChange({ ...filters, shift_weekends: v })} />
            <ChipToggle label="Full-time" value={!!filters.shift_full_time} onChange={(v) => onChange({ ...filters, shift_full_time: v })} />
            <ChipToggle label="Part-time" value={!!filters.shift_part_time} onChange={(v) => onChange({ ...filters, shift_part_time: v })} />
          </ScrollView>
        </View>
        <View>
          <Text style={styles.label}>Active only</Text>
          <ChipToggle label="Active only" value={filters.is_active ?? true} onChange={(v) => onChange({ ...filters, is_active: v })} />
        </View>
        <TextInput
          placeholder="Location contains..."
          value={filters.location_query ?? ''}
          onChangeText={(t) => onChange({ ...filters, location_query: t })}
          style={styles.search}
        />
        <TextInput
          placeholder="Min ₪/h"
          keyboardType="numeric"
          value={filters.min_wage_at_least ?? ''}
          onChangeText={(t) => onChange({ ...filters, min_wage_at_least: t })}
          style={styles.search}
        />
      </View>
    </View>
  );
}

function RoleCard({ role, onEdit, onDelete }: { role: RoleOut; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.cardTitle}>{titleCase(role.position)} • ₪{role.payment_per_hour}/h</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={onEdit} style={styles.iconBtn} accessibilityLabel="Edit role" accessibilityRole="button">
            <FontAwesome name="pencil" size={16} color="#0a7ea4" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.iconBtn} accessibilityLabel="Delete role" accessibilityRole="button">
            <FontAwesome name="trash" size={16} color="#ff3b30" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.dim}>{role.location}</Text>
      {!!role.about_job && <Text numberOfLines={3}>{role.about_job}</Text>}
      <View style={styles.chipsRow}>
        <Chip label={titleCase(role.when_need)} />
        <Chip label={prettyExperience(role.experience_required)} />
        {role.shift_morning && <Chip label="Morning" />}
        {role.shift_evening && <Chip label="Evening" />}
        {role.shift_weekends && <Chip label="Weekends" />}
        {role.shift_full_time && <Chip label="Full-time" />}
        {role.shift_part_time && <Chip label="Part-time" />}
        {role.is_active === false && <Chip label="Inactive" />}
      </View>
      {!!role.created_at && <Text style={styles.dim}>Created {new Date(role.created_at).toLocaleString()}</Text>}
    </View>
  );
}

function RoleEditorModal({ visible, onClose, onSave, role, businesses, defaultBusinessId, mapPickerOpen, setMapPickerOpen }: {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: RoleCreate | RoleUpdate) => void | Promise<void>;
  role: RoleOut | null;
  businesses: BusinessOut[];
  defaultBusinessId?: number;
  mapPickerOpen: boolean;
  setMapPickerOpen: (v: boolean) => void;
}) {
  const [form, setForm] = useState<RoleCreate | RoleUpdate>(() => role ? {
    business_id: role.business_id,
    position: role.position,
    payment_per_hour: role.payment_per_hour,
    location: role.location,
    when_need: role.when_need,
    experience_required: role.experience_required,
    shift_morning: role.shift_morning,
    shift_evening: role.shift_evening,
    shift_weekends: role.shift_weekends,
    shift_full_time: role.shift_full_time,
    shift_part_time: role.shift_part_time,
    about_job: role.about_job ?? '',
    min_hourly_wage: role.min_hourly_wage ?? undefined,
    is_active: role.is_active ?? true,
  } : {
    business_id: defaultBusinessId || (businesses[0]?.id ?? 0),
    position: 'waiter',
    payment_per_hour: 40,
    location: '',
    when_need: 'this_week',
    experience_required: 'no_experience',
    shift_morning: false,
    shift_evening: false,
    shift_weekends: false,
    shift_full_time: false,
    shift_part_time: true,
    about_job: '',
    min_hourly_wage: undefined,
    is_active: true,
  });

  const set = (patch: Partial<RoleCreate & RoleUpdate>) => setForm({ ...(form as any), ...(patch as any) });

  const submit = async () => {
    // Basic validation
    if (!form.location || !form.payment_per_hour) return;
    await onSave(form);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{role ? 'Edit Role' : 'Create Role'}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.link}>Close</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <Select
            label="Business"
            value={String((form as any).business_id ?? '')}
            options={businesses.map((b) => ({ label: b.name, value: String(b.id) }))}
            onChange={(v) => set({ business_id: Number(v) })}
          />
          <Select
            label="Position"
            value={(form as any).position}
            options={POSITIONS.map((p) => ({ label: titleCase(p), value: p }))}
            onChange={(v) => set({ position: v as any })}
          />
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.label}>Payment per hour</Text>
            <PaymentSlider
              min={34}
              max={250}
              step={1}
              value={(form as any).payment_per_hour ?? 34}
              onChange={(v) => set({ payment_per_hour: v })}
            />
          </View>
          <TextInput
            placeholder="Location"
            value={(form as any).location}
            onChangeText={(t) => set({ location: t })}
            style={styles.input}
          />
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={async () => {
              try {
                const { getCurrentPositionAsync, requestForegroundPermissionsAsync, reverseGeocodeAsync } = await import('expo-location');
                const perm = await requestForegroundPermissionsAsync();
                if (perm.status !== 'granted') return;
                const pos = await getCurrentPositionAsync({});
                const res = await reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                const first = res[0];
                const pretty = [first?.name, first?.street, first?.city, first?.region].filter(Boolean).join(', ');
                set({ location: pretty || `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`, latitude: pos.coords.latitude, longitude: pos.coords.longitude });
              } catch {}
            }}>
              <Text style={styles.secondaryBtnText}>Use my location</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setMapPickerOpen(true)}>
              <Text style={styles.secondaryBtnText}>Pick on map</Text>
            </TouchableOpacity>
          </View>
          <Select
            label="When needed"
            value={(form as any).when_need}
            options={WHEN_NEED.map((p) => ({ label: titleCase(p), value: p }))}
            onChange={(v) => set({ when_need: v as any })}
          />
          <Select
            label="Experience required"
            value={(form as any).experience_required}
            options={EXPERIENCE.map((p) => ({ label: prettyExperience(p), value: p }))}
            onChange={(v) => set({ experience_required: v as any })}
          />
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.label}>Hours</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectRow}>
              <ChipToggle label="Morning" value={(form as any).shift_morning} onChange={(v) => set({ shift_morning: v })} />
              <ChipToggle label="Evening" value={(form as any).shift_evening} onChange={(v) => set({ shift_evening: v })} />
              <ChipToggle label="Weekends" value={(form as any).shift_weekends} onChange={(v) => set({ shift_weekends: v })} />
              <ChipToggle label="Full-time" value={(form as any).shift_full_time} onChange={(v) => set({ shift_full_time: v })} />
              <ChipToggle label="Part-time" value={(form as any).shift_part_time} onChange={(v) => set({ shift_part_time: v })} />
            </ScrollView>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={styles.label}>Active</Text>
            <Switch value={(form as any).is_active ?? true} onValueChange={(v) => set({ is_active: v })} />
          </View>
          <TextInput
            placeholder="About the job"
            value={(form as any).about_job ?? ''}
            onChangeText={(t) => set({ about_job: t })}
            style={[styles.input, { height: 100 }]}
            multiline
          />
        </ScrollView>
        <MapPickerModal
          visible={mapPickerOpen}
          onClose={() => setMapPickerOpen(false)}
          initial={{ latitude: (form as any).latitude ?? 32.0853, longitude: (form as any).longitude ?? 34.7818 }}
          onPick={async (coords) => {
            try {
              const res = await Location.reverseGeocodeAsync(coords);
              const first = res[0];
              const pretty = [first?.name, first?.street, first?.city, first?.region].filter(Boolean).join(', ');
              set({ latitude: coords.latitude, longitude: coords.longitude, location: pretty || `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}` });
            } catch {
              set({ latitude: coords.latitude, longitude: coords.longitude });
            }
            setMapPickerOpen(false);
          }}
        />
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 8 }]} onPress={submit}>
          <Text style={styles.primaryBtnText}>{role ? 'Save Changes' : 'Create Role'}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: { label: string; value: string }[]; onChange: (v: string) => void }) {
  return (
    <View style={styles.selectWrap}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectRow}>
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.chip, value === opt.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, value === opt.value && styles.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function ChipToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={[styles.chip, value && styles.chipActive]}> 
      <Text style={[styles.chipText, value && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={[styles.chip, styles.chipActive]}>
      <Text style={[styles.chipText, styles.chipTextActive]}>{label}</Text>
    </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  primaryBtn: { backgroundColor: '#0a7ea4', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  filters: { marginBottom: 8 },
  filtersRow: { gap: 8, alignItems: 'center' },
  filtersCol: { gap: 8 },
  selectWrap: { marginRight: 8 },
  selectRow: { gap: 6, alignItems: 'center' },
  label: { fontSize: 12, color: '#555', marginBottom: 4 },
  chip: { borderWidth: 1, borderColor: '#ccc', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  chipActive: { backgroundColor: '#0a7ea4', borderColor: '#0a7ea4' },
  chipText: { color: '#333', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  search: { borderWidth: 1, borderColor: '#ccc', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, minWidth: 110 },
  rowWrap: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: '#ddd', padding: 14, borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  dim: { color: '#666', marginBottom: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  link: { color: '#0a7ea4', fontWeight: '700' },
  modalWrap: { flex: 1, padding: 16, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#f2f2f2', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  secondaryBtnText: { color: '#333', fontWeight: '700' },
  iconBtn: { backgroundColor: '#f2f7fb', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
});

function PaymentSlider({ min, max, step, value, onChange }: { min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ width: '70%', alignSelf: 'center' }}>
      <Text style={{ marginBottom: 6, fontWeight: '700', textAlign: 'center' }}>₪{value}/h</Text>
      <Slider
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor="#0a7ea4"
        maximumTrackTintColor="#e5e5e5"
        thumbTintColor="#0a7ea4"
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text>₪{min}</Text>
        <Text>₪{max}</Text>
      </View>
    </View>
  );
}


