import { WaiterOut, getWaiter, updateWaiter } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Slider from '@react-native-community/slider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const STATUS: NonNullable<WaiterOut['status']>[] = ['pre_army','post_army','student','other'];
const LOOKING_FOR: NonNullable<WaiterOut['looking_for']>[number][] = ['waiter','bartender','barista','hostess','shift_manager','manager'];
const HOURS: NonNullable<WaiterOut['hours']>[number][] = ['part_time','full_time','morning','evening','weekends'];
const EXPERIENCE: NonNullable<WaiterOut['experience']>[number][] = ['waiter','barman','barista','shift_manager','host'];
const PEOPLE_SAY: NonNullable<WaiterOut['people_say']>[number][] = ['best_coffee_maker','good_vibe','best_cocktails','customers_love_me'];
const SKILLS: NonNullable<WaiterOut['skills']>[number][] = ['customer_service','basic_computer','coffee_making','teamwork','food_service','working_under_pressure','table_management'];

export default function WaiterSettings() {
  const { user } = useAuth();
  const userId = useMemo(() => (user ? (user as any).id ?? 0 : 0), [user]);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['waiter', userId], queryFn: () => getWaiter(userId), enabled: !!userId });
  const mut = useMutation({
    mutationFn: async (payload: Partial<WaiterOut>) => {
      return await updateWaiter(userId, payload as any);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waiter', userId] }),
  });

  const profile = query.data;
  const [form, setForm] = useState<Partial<WaiterOut> | null>(null);
  const current = form ?? profile ?? {};
  const set = (patch: Partial<WaiterOut>) => setForm({ ...(current as any), ...(patch as any) });

  const toggleInArray = <T,>(arr: T[] | undefined, value: T): T[] => {
    const list = arr ? [...arr] : [] as T[];
    const i = list.findIndex((x) => x === value);
    if (i >= 0) list.splice(i, 1); else list.push(value);
    return list;
  };

  const save = async () => {
    if (!userId) return;
    const payload: Partial<WaiterOut> = {};
    if (current.display_name || (user as any)?.display_name) payload.display_name = (current.display_name ?? (user as any)?.display_name) as any;
    if (current.about_me !== undefined) payload.about_me = current.about_me;
    if (current.status !== undefined) payload.status = current.status as any;
    if (current.distance_km !== undefined && !Number.isNaN(Number(current.distance_km))) payload.distance_km = Number(current.distance_km);
    if (current.min_hourly_wage !== undefined && !Number.isNaN(Number(current.min_hourly_wage))) payload.min_hourly_wage = Number(current.min_hourly_wage);
    if (current.shifts_per_week !== undefined && !Number.isNaN(Number(current.shifts_per_week))) payload.shifts_per_week = Number(current.shifts_per_week);
    if (current.looking_for) payload.looking_for = current.looking_for as any;
    if (current.hours) payload.hours = current.hours as any;
    if (current.experience) payload.experience = current.experience as any;
    if (current.people_say) payload.people_say = current.people_say as any;
    if (current.skills) payload.skills = current.skills as any;
    await mut.mutateAsync(payload);
    setForm(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={styles.title}>Preferences</Text>
      <Select
        label="Status"
        value={current.status ?? ''}
        options={[{ label: '—', value: '' }, ...STATUS.map((s) => ({ label: titleCase(s), value: s }))]}
        onChange={(v) => set({ status: (v as any) || undefined })}
      />
      <MultiSelect label="Looking for" values={current.looking_for ?? []} options={LOOKING_FOR} onToggle={(v) => set({ looking_for: toggleInArray(current.looking_for, v) })} />
      <TextInput placeholder="About me" value={current.about_me ?? ''} onChangeText={(t) => set({ about_me: t })} style={styles.input} multiline />
      <View style={styles.sliderBlock}>
        <Text style={styles.label}>Distance (km): {current.distance_km ?? 0}</Text>
        <Slider
          minimumValue={0}
          maximumValue={70}
          step={1}
          value={current.distance_km ?? 0}
          onValueChange={(v) => set({ distance_km: Math.round(v) })}
          minimumTrackTintColor="#0a7ea4"
          maximumTrackTintColor="#e5e5e5"
          thumbTintColor="#0a7ea4"
        />
        <View style={styles.sliderScale}><Text>0</Text><Text>70</Text></View>
      </View>

      <View style={styles.sliderBlock}>
        <Text style={styles.label}>Minimum ₪/h: {current.min_hourly_wage ?? 34}</Text>
        <Slider
          minimumValue={34}
          maximumValue={250}
          step={1}
          value={current.min_hourly_wage ?? 34}
          onValueChange={(v) => set({ min_hourly_wage: Math.round(v) })}
          minimumTrackTintColor="#0a7ea4"
          maximumTrackTintColor="#e5e5e5"
          thumbTintColor="#0a7ea4"
        />
        <View style={styles.sliderScale}><Text>₪34</Text><Text>₪250</Text></View>
      </View>

      <View style={styles.sliderBlock}>
        <Text style={styles.label}>Shifts per week: {current.shifts_per_week ?? 1}</Text>
        <Slider
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={current.shifts_per_week ?? 1}
          onValueChange={(v) => set({ shifts_per_week: Math.round(v) })}
          minimumTrackTintColor="#0a7ea4"
          maximumTrackTintColor="#e5e5e5"
          thumbTintColor="#0a7ea4"
        />
        <View style={styles.sliderScale}><Text>1</Text><Text>10</Text></View>
      </View>
      <MultiSelect label="Hours" values={current.hours ?? []} options={HOURS} onToggle={(v) => set({ hours: toggleInArray(current.hours, v) })} />
      <MultiSelect label="Experience" values={current.experience ?? []} options={EXPERIENCE} onToggle={(v) => set({ experience: toggleInArray(current.experience, v) })} />
      <MultiSelect label="People say" values={current.people_say ?? []} options={PEOPLE_SAY} onToggle={(v) => set({ people_say: toggleInArray(current.people_say, v) })} />
      <MultiSelect label="Skills" values={current.skills ?? []} options={SKILLS} onToggle={(v) => set({ skills: toggleInArray(current.skills, v) })} />

      <TouchableOpacity style={[styles.primaryBtn, mut.isPending && { opacity: 0.7 }]} onPress={save} disabled={mut.isPending}>
        <Text style={styles.primaryBtnText}>{mut.isPending ? 'Saving…' : 'Save'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: { label: string; value: string }[]; onChange: (v: string) => void }) {
  return (
    <View style={styles.selectWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.selectRow}>
        {options.map((opt) => (
          <TouchableOpacity key={opt.value} onPress={() => onChange(opt.value)} style={[styles.chip, value === opt.value && styles.chipActive]}>
            <Text style={[styles.chipText, value === opt.value && styles.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function MultiSelect<T extends string>({ label, values, options, onToggle }: { label: string; values: T[]; options: T[]; onToggle: (v: T) => void }) {
  return (
    <View style={styles.selectWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.selectRow}>
        {options.map((opt) => {
          const active = values?.includes(opt);
          return (
            <TouchableOpacity key={opt} onPress={() => onToggle(opt)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{titleCase(opt)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function titleCase(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, marginBottom: 8 },
  selectWrap: { marginBottom: 8 },
  label: { fontSize: 12, color: '#555', marginBottom: 4 },
  selectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sliderBlock: { marginBottom: 12 },
  sliderScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  chip: { borderWidth: 1, borderColor: '#ccc', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  chipActive: { backgroundColor: '#0a7ea4', borderColor: '#0a7ea4' },
  chipText: { color: '#333', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  primaryBtn: { backgroundColor: '#0a7ea4', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
});


