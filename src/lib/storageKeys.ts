export const ACTIVE_CONFIG_KEY = 'active_ai_config'
export const PRESETS_KEY = 'ai_config_presets'
export const APP_PREFERENCES_KEY = 'app-preferences'

export const SENSITIVE_SETTING_KEYS = [ACTIVE_CONFIG_KEY, PRESETS_KEY] as const

export function isSensitiveSettingKey(key: string): boolean {
  return (SENSITIVE_SETTING_KEYS as readonly string[]).includes(key)
}
