import Colors from "@/constants/Colors";

export const API_BASE_URL = 'http://10.100.102.5:8000/';

export const SECURE_STORE_KEYS = {
  accessToken: 'tt_access_token',
  refreshToken: 'tt_refresh_token',
  timeoutToken: 'tt_timeout_token',
  user: 'tt_user',
} as const;

export const STYLES = {
  container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 50, fontWeight: '800', color: Colors.blue.text, marginBottom: 24 },
  subtitle: { fontSize: 30, color: '#666', marginBottom: 24, marginTop: 40, textAlign: 'center' },
  primaryButton: {
    backgroundColor: '#0000CD',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '60%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
} as const;
