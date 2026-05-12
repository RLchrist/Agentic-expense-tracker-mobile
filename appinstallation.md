eas login
eas build:configure


eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "your-supabase-url"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-supabase-anon-key"

eas build --platform android --profile preview