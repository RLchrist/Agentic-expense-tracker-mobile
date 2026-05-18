import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Coins, Languages, Search, Check, ChevronRight, SkipForward } from 'lucide-react-native'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useAppTheme } from '../../hooks/useAppTheme'
import { changeLang } from '../../i18n'

const CURRENCIES = [
  { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨', flag: '🇳🇵' },
  { code: 'USD', name: 'United States Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
]

export default function OnboardingScreen() {
  const { colors } = useAppTheme()
  const { updateProfile } = useAuthStore()
  const { setLanguage, setOnboardingComplete } = useSettingsStore()
  const insets = useSafeAreaInsets()

  const [step, setStep] = useState<1 | 2>(1)
  const [selectedCurrency, setSelectedCurrency] = useState('NPR')
  const [selectedLang, setSelectedLang] = useState<'en' | 'np'>('en')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Filter currencies in real-time
  const filteredCurrencies = useMemo(() => {
    if (!searchQuery.trim()) return CURRENCIES
    const query = searchQuery.toLowerCase().trim()
    return CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query)
    )
  }, [searchQuery])

  // Handle continuing from step 1 (Currency)
  const handleContinueStep1 = () => {
    setStep(2)
  }

  // Skip on step 1: Defaults silently to NPR and goes to Step 2
  const handleSkipStep1 = () => {
    setSelectedCurrency('NPR')
    setStep(2)
  }

  // Handle final completion
  const handleCompleteSetup = async (finalLang = selectedLang) => {
    setIsSaving(true)
    try {
      // 1. Update Supabase profiles table and Zustand authStore profile
      await updateProfile({
        currency: selectedCurrency,
        language: finalLang,
      })

      // 2. Set language in settingsStore (which updates MMKV)
      setLanguage(finalLang)

      // 3. Change active language for i18n
      await changeLang(finalLang)

      // 4. Mark onboarding as complete in settingsStore (which updates MMKV)
      setOnboardingComplete(true)
    } catch (error) {
      console.error('Failed to complete onboarding setup:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Skip on step 2: Defaults silently to English and completes setup
  const handleSkipStep2 = async () => {
    await handleCompleteSetup('en')
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View 
          className="flex-1 justify-between px-6 pt-6"
          style={{ paddingBottom: Math.max(insets.bottom, 24) }}
        >
          {/* Header & Progress Indicator */}
          <View>
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center">
                  <Coins size={16} className="text-primary" />
                </View>
                <Text className="text-text font-bold text-lg">Setup Preferences</Text>
              </View>
              <View className="flex-row gap-1">
                <View className={`h-1.5 w-6 rounded-full ${step === 1 ? 'bg-primary' : 'bg-border'}`} />
                <View className={`h-1.5 w-6 rounded-full ${step === 2 ? 'bg-primary' : 'bg-border'}`} />
              </View>
            </View>

            {/* Steps Content */}
            {step === 1 ? (
              <View className="gap-4">
                <View>
                  <Text className="text-2xl font-bold text-text mb-2">Choose Your Currency</Text>
                  <Text className="text-textSecondary text-[14px]">
                    Select the default currency to track your expenses. You can always change this later in Settings.
                  </Text>
                </View>

                {/* Search Bar */}
                <View className="flex-row items-center bg-surfaceLight border border-border rounded-xl px-3 py-1">
                  <Search size={18} className="text-textSecondary mr-2" />
                  <TextInput
                    placeholder="Search currency (e.g. NPR, USD)"
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="flex-1 text-text py-2.5 text-[15px]"
                  />
                  {searchQuery !== '' && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Text className="text-textSecondary text-[14px] font-medium px-2">Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Currency Scrollable List */}
                <View className="h-[280px] bg-surface border border-border rounded-2xl overflow-hidden">
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                    className="divide-y divide-border"
                  >
                    {filteredCurrencies.length > 0 ? (
                      filteredCurrencies.map((item) => {
                        const isSelected = selectedCurrency === item.code
                        return (
                          <TouchableOpacity
                            key={item.code}
                            onPress={() => setSelectedCurrency(item.code)}
                            className={`flex-row items-center justify-between p-4 ${
                              isSelected ? 'bg-primary/5' : ''
                            }`}
                          >
                            <View className="flex-row items-center gap-3">
                              <Text className="text-2xl">{item.flag}</Text>
                              <View>
                                <Text className="text-text font-semibold text-[15px]">{item.code}</Text>
                                <Text className="text-textSecondary text-[12px]">{item.name}</Text>
                              </View>
                            </View>
                            <View className="flex-row items-center gap-3">
                              <Text className="text-textSecondary font-medium text-[15px]">
                                {item.symbol}
                              </Text>
                              {isSelected ? (
                                <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                                  <Check size={12} color="#fff" />
                                </View>
                              ) : (
                                <View className="w-5 h-5 rounded-full border border-border" />
                              )}
                            </View>
                          </TouchableOpacity>
                        )
                      })
                    ) : (
                      <View className="items-center justify-center py-10">
                        <Text className="text-textSecondary">No currencies found</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              </View>
            ) : (
              <View className="gap-6">
                <View>
                  <Text className="text-2xl font-bold text-text mb-2">Preferred Language</Text>
                  <Text className="text-textSecondary text-[14px]">
                    Pick the language you're most comfortable with.
                  </Text>
                </View>

                {/* Language Selection list */}
                <View className="gap-3">
                  <TouchableOpacity
                    onPress={() => setSelectedLang('en')}
                    className={`flex-row items-center justify-between p-5 bg-surface border rounded-2xl ${
                      selectedLang === 'en' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <View className="flex-row items-center gap-4">
                      <View className="w-10 h-10 rounded-xl bg-blue-500/10 items-center justify-center">
                        <Languages size={20} className="text-blue-500" />
                      </View>
                      <View>
                        <Text className="text-text font-bold text-[16px]">English</Text>
                        <Text className="text-textSecondary text-[13px]">Default System Language</Text>
                      </View>
                    </View>
                    {selectedLang === 'en' ? (
                      <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                        <Check size={14} color="#fff" />
                      </View>
                    ) : (
                      <View className="w-6 h-6 rounded-full border border-border" />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setSelectedLang('np')}
                    className={`flex-row items-center justify-between p-5 bg-surface border rounded-2xl ${
                      selectedLang === 'np' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <View className="flex-row items-center gap-4">
                      <View className="w-10 h-10 rounded-xl bg-red-500/10 items-center justify-center">
                        <Languages size={20} className="text-red-500" />
                      </View>
                      <View>
                        <Text className="text-text font-bold text-[16px]">नेपाली (Nepali)</Text>
                        <Text className="text-textSecondary text-[13px]">नेपाली भाषामा अनुप्रयोग प्रयोग गर्नुहोस्</Text>
                      </View>
                    </View>
                    {selectedLang === 'np' ? (
                      <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                        <Check size={14} color="#fff" />
                      </View>
                    ) : (
                      <View className="w-6 h-6 rounded-full border border-border" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons Footer */}
          <View className="gap-3 mt-6">
            {step === 1 ? (
              <>
                <TouchableOpacity
                  onPress={handleContinueStep1}
                  className="w-full bg-primary py-4 rounded-2xl flex-row items-center justify-center gap-2 shadow-md"
                  style={{
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  <Text className="text-white font-bold text-[16px]">Continue</Text>
                  <ChevronRight size={18} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSkipStep1}
                  className="w-full py-3.5 rounded-2xl flex-row items-center justify-center gap-1.5"
                >
                  <SkipForward size={14} className="text-textSecondary" />
                  <Text className="text-textSecondary font-semibold text-[14px]">Skip for now (NPR)</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => handleCompleteSetup()}
                  disabled={isSaving}
                  className="w-full bg-primary py-4 rounded-2xl flex-row items-center justify-center gap-2 shadow-md"
                  style={{
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text className="text-white font-bold text-[16px]">Complete Setup</Text>
                      <Check size={18} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSkipStep2}
                  disabled={isSaving}
                  className="w-full py-3.5 rounded-2xl flex-row items-center justify-center gap-1.5"
                >
                  <SkipForward size={14} className="text-textSecondary" />
                  <Text className="text-textSecondary font-semibold text-[14px]">Skip for now (English)</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}
