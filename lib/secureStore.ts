import * as SecureStore from 'expo-secure-store';

export async function saveSecureItem(key: string, value: string) {
  await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
}

export async function getSecureItem(key: string) {
  return SecureStore.getItemAsync(key);
}

export async function deleteSecureItem(key: string) {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}


