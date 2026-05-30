import { useEffect, useState, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, Alert, TextInput, Image, ActivityIndicator, ScrollView
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { 
  Plus, Search, X, Trash2, List, FileText, Pencil, 
  Camera, Mic, Square, ArrowRight, ChevronDown, Image as ImageIcon 
} from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder'
import { parseExpenseFromText, ParsedExpense } from '../../services/ai/parseExpense'
import VoiceExpenseModal from '../../components/common/VoiceExpenseModal'
import { useAuthStore } from '../../store/authStore'
import { useExpenseStore } from '../../store/expenseStore'
import { useAppTheme } from '../../hooks/useAppTheme'
import { Expense } from '../../types'
import { Skeleton } from '../../components/common/Skeleton'
import OfflineBanner from '../../components/common/OfflineBanner'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import Swipeable from 'react-native-gesture-handler/Swipeable'
import { formatCurrency } from '../../utils'

export default function ExpensesScreen({ navigation }: any) {
  const { colors } = useAppTheme()
  const { profile } = useAuthStore()
  const { isOffline } = useNetworkStatus()
  const { expenses, isLoading, fetchExpenses, deleteExpense, fetchCategories } = useExpenseStore()
  const [search, setSearch] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'week' | 'month'>('today')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // AI & Speech States
  const [showAI, setShowAI] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [parsedResult, setParsedResult] = useState<ParsedExpense | null>(null)
  const { isRecording, startRecording: triggerStartRecording, stopRecording: triggerStopRecording } = useVoiceRecorder()

  useEffect(() => {
    fetchExpenses()
    fetchCategories()
  }, [])

  const startVoiceInput = async () => {
    if (isRecording) return
    if (isOffline) {
      Alert.alert('Voice Unavailable', 'Voice input is not available in offline mode.')
      return
    }
    try {
      await triggerStartRecording()
    } catch (e) {
      console.error('Voice start failed:', e)
      Alert.alert('Error', 'Could not start voice input')
    }
  }

  const stopVoiceInput = async () => {
    try {
      const text = await triggerStopRecording()
      if (text) {
        setInputText(text)
      }
    } catch (e) {
      console.error('Voice error:', e)
    }
  }

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera access.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    })
    if (!result.canceled) {
      setAttachedImages(prev => [...prev, result.assets[0].uri])
    }
  }

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need gallery access.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
    })
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri)
      setAttachedImages(prev => [...prev, ...uris])
    }
  }

  const handleManualParse = async () => {
    if (isParsing) return
    setIsParsing(true)
    const result = await parseExpenseFromText(
      inputText, 
      useExpenseStore.getState().categories,
      attachedImages
    )
    setIsParsing(false)
    if (result) {
      setParsedResult(result)
      setShowAI(true)
      setAttachedImages([])
    } else {
      Alert.alert('Error', 'Could not understand the expense. Please try again.')
    }
  }

  const filtered = expenses.filter((e) => {
    const matchSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.category?.name.toLowerCase().includes(search.toLowerCase()) ||
      e.note?.toLowerCase().includes(search.toLowerCase())

    if (!matchSearch) return false

    if (selectedCategory && e.category_id !== selectedCategory) return false

    const now = new Date()
    const d = new Date(e.expense_date)

    if (selectedFilter === 'today')
      return d.toDateString() === now.toDateString()
    if (selectedFilter === 'week') {
      const weekAgo = new Date(now)
      weekAgo.setDate(now.getDate() - 7)
      return d >= weekAgo
    }
    if (selectedFilter === 'month')
      return d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()

    return true
  })

  const totalFiltered = filtered.reduce((sum, e) => sum + Number(e.amount), 0)

  const FILTERS = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'all', label: 'All' },
  ]

  return (
    <SafeAreaView className="flex-1 bg-background">
      <OfflineBanner />
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 pt-2 pb-6">
        {showSearch ? (
          <View className="flex-1 flex-row items-center bg-surface rounded-xl px-4 border border-border">
            <Search size={16} className="text-textSecondary mr-2" />
            <TextInput
              className="flex-1 text-text text-[15px] py-2"
              placeholder="Search expenses..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={18} className="text-textSecondary" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => { setShowSearch(false); setSearch('') }} className="ml-2">
              <Text className="text-primary text-[15px] font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text className="text-[26px] font-bold text-text">Expenses</Text>
            <TouchableOpacity onPress={() => setShowSearch(true)}>
              <Search size={22} className="text-textSecondary" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* AI Voice/Photo/Text Input Bar */}
      <View className="px-6 mb-6 z-10">
        {showActionMenu && (
          <View 
            className="absolute top-14 left-6 bg-[#1E1E1E] rounded-2xl w-[200px] p-1 shadow-xl z-50 border border-white/10"
          >
            <TouchableOpacity 
              className="flex-row items-center p-4 gap-4"
              onPress={() => {
                setShowActionMenu(false)
                navigation.navigate('AddExpense')
              }}
            >
              <Plus size={20} className="text-white" />
              <Text className="text-white text-[15px] font-medium">Manual Add</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className="flex-row items-center p-4 gap-4 border-t border-white/10"
              onPress={() => {
                setShowActionMenu(false)
                openCamera()
              }}
            >
              <Camera size={20} className="text-white" />
              <Text className="text-white text-[15px] font-medium">Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className="flex-row items-center p-4 gap-4 border-t border-white/10"
              onPress={() => {
                setShowActionMenu(false)
                openGallery()
              }}
            >
              <ImageIcon size={20} className="text-white" />
              <Text className="text-white text-[15px] font-medium">Photos & Files</Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="bg-surface rounded-[28px] p-1 border border-border shadow-md">
          {attachedImages.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2 px-1">
              {attachedImages.map((uri, idx) => (
                <View key={idx} className="mr-2 relative">
                  <Image source={{ uri }} className="w-[70px] h-[70px] rounded-xl border border-border" />
                  <TouchableOpacity
                    className="absolute -top-1.5 -right-1.5 bg-error w-[22px] h-[22px] rounded-full justify-center items-center border-2 border-surface"
                    onPress={() => setAttachedImages(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <Text className="text-white text-[12px] font-bold">✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <View className="flex-row items-center py-0.5">
            <TouchableOpacity 
              className="w-[38px] h-[38px] rounded-full justify-center items-center"
              onPress={() => setShowActionMenu(!showActionMenu)}
            >
              <Plus size={24} className="text-text" />
            </TouchableOpacity>
            
            <TextInput
              className="flex-1 text-text text-[15px] px-4 max-h-[100px]"
              placeholder="How much did you spend?"
              placeholderTextColor={colors.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
             
            <View className="flex-row gap-4 px-2">
              {!isOffline && (
                <TouchableOpacity 
                  className={isRecording ? "bg-error/15 rounded-[15px] p-0.5" : ""}
                  onPress={isRecording ? stopVoiceInput : startVoiceInput}
                >
                  {isRecording ? (
                    <Square size={20} className="text-error" />
                  ) : (
                    <Mic size={20} className="text-textSecondary" />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {(inputText.trim() !== '' || attachedImages.length > 0) && (
              <TouchableOpacity 
                className="w-[46px] h-[46px] rounded-full bg-primary justify-center items-center ml-1 shadow-md"
                onPress={handleManualParse}
                disabled={isParsing}
              >
                {isParsing ? <ActivityIndicator size="small" className="text-white" /> : <ArrowRight size={24} className="text-white" />}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>



      {/* Filter chips */}
      <View className="flex-row gap-2 px-6 mb-4">
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            className={`px-4 py-1.5 rounded-full border ${selectedFilter === f.key ? 'bg-primary border-primary' : 'bg-surface border-border'}`}
            onPress={() => setSelectedFilter(f.key as any)}
          >
            <Text className={`text-[13px] font-medium ${selectedFilter === f.key ? 'text-white' : 'text-textSecondary'}`}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category Filter */}
      <View className="px-6 mb-4 z-20">
        <View className="relative">
          <TouchableOpacity
            className="flex-row items-center justify-between bg-surface border border-border rounded-xl px-4 py-3"
            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
          >
            <View className="flex-row items-center gap-2">
              {(() => {
                const cat = useExpenseStore.getState().categories.find(c => c.id === selectedCategory)
                return cat ? (
                  <>
                    <Text className="text-base">{cat.icon}</Text>
                    <Text className="text-text text-[14px] font-medium">{cat.name}</Text>
                  </>
                ) : (
                  <Text className="text-text text-[14px] font-medium">All Categories</Text>
                )
              })()}
            </View>
            <ChevronDown size={18} className="text-textSecondary" />
          </TouchableOpacity>

          {showCategoryDropdown && (
            <View className="absolute top-14 left-0 right-0 bg-[#1E1E1E] rounded-xl border border-white/10 shadow-xl z-50">
              {[{ id: null, name: 'All Categories', icon: '' }, ...useExpenseStore.getState().categories].map((item) => (
                <TouchableOpacity
                  key={item.id ?? 'all'}
                  className={`flex-row items-center px-4 py-3 gap-3 ${selectedCategory === item.id ? 'bg-primary/20' : ''}`}
                  onPress={() => { setSelectedCategory(item.id); setShowCategoryDropdown(false) }}
                >
                  {item.icon ? <Text className="text-base">{item.icon}</Text> : null}
                  <Text className={`text-[14px] ${selectedCategory === item.id ? 'text-primary font-semibold' : 'text-text'}`}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Summary bar */}
      <View className="flex-row justify-between px-6 py-2 bg-surface mx-6 rounded-xl mb-2 border border-border">
        <Text className="text-textSecondary text-[13px]">
          {isLoading ? '...' : `${filtered.length} expense${filtered.length !== 1 ? 's' : ''}`}
        </Text>
        <Text className="text-text font-bold text-[13px]">
          {formatCurrency(totalFiltered, profile?.currency ?? 'NPR')}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={isLoading ? [] : filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchExpenses}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={(isLoading ? false : filtered.length === 0) ? { flex: 1 } : { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 8 }}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: 24, paddingTop: 8, gap: 8 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} className="flex-row items-center bg-surface rounded-2xl p-4 border border-border">
                  <Skeleton width={46} height={46} borderRadius={12} />
                  <View className="flex-1 ml-3 gap-1.5">
                    <Skeleton width="60%" height={14} borderRadius={4} />
                    <Skeleton width="45%" height={12} borderRadius={4} />
                  </View>
                  <Skeleton width={70} height={16} borderRadius={4} />
                </View>
              ))}
            </View>
          ) : (
            <View className="flex-1 items-center justify-center pt-20">
              <List size={52} className="text-textSecondary mb-2" />
              <Text className="text-text text-lg font-bold">No expenses found</Text>
              <Text className="text-textSecondary text-sm mt-1">
                {search ? 'Try a different search' : 'Add your first expense'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ExpenseRow 
            expense={item} 
            onDelete={deleteExpense} 
            onEdit={(exp) => navigation.navigate('AddExpense', { expense: exp })} 
          />
        )}
      />

      <VoiceExpenseModal
        visible={showAI}
        onClose={() => { setShowAI(false); setParsedResult(null); setInputText('') }}
        onSaved={() => { fetchExpenses(); setInputText('') }}
        initialParsed={parsedResult}
      />
    </SafeAreaView>
  )
}

function ExpenseRow({
  expense,
  onDelete,
  onEdit,
}: {
  expense: Expense
  onDelete: (id: string) => void
  onEdit: (expense: Expense) => void
}) {
  const { colors } = useAppTheme()
  const { profile } = useAuthStore()
  const swipeableRef = useRef<any>(null)
  
  const formattedDate = expense.created_at 
    ? `${new Date(expense.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${new Date(expense.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}`
    : ''

  const renderSwipeActions = () => (
    <View className="flex-row items-center pl-2 mb-2" style={{ height: '100%' }}>
      <TouchableOpacity 
        className="bg-primary justify-center items-center px-4 rounded-xl mr-2 h-[52px]"
        onPress={() => {
          swipeableRef.current?.close()
          onEdit(expense)
        }}
      >
        <Pencil size={20} className="text-white" />
      </TouchableOpacity>
      <TouchableOpacity 
        className="bg-error justify-center items-center px-4 rounded-xl h-[52px] mr-2"
        onPress={() => {
          swipeableRef.current?.close()
          Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete(expense.id) }
          ])
        }}
      >
        <Trash2 size={20} className="text-white" />
      </TouchableOpacity>
    </View>
  )

  const renderRightSwipeActions = () => (
    <View className="flex-row items-center pr-2 mb-2" style={{ height: '100%' }}>
      <TouchableOpacity 
        className="bg-primary justify-center items-center px-4 rounded-xl mr-2 h-[52px]"
        onPress={() => {
          swipeableRef.current?.close()
          onEdit(expense)
        }}
      >
        <Pencil size={20} className="text-white" />
      </TouchableOpacity>
      <TouchableOpacity 
        className="bg-error justify-center items-center px-4 rounded-xl h-[52px]"
        onPress={() => {
          swipeableRef.current?.close()
          Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete(expense.id) }
          ])
        }}
      >
        <Trash2 size={20} className="text-white" />
      </TouchableOpacity>
    </View>
  )

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderSwipeActions}
      renderRightActions={renderRightSwipeActions}
    >
      <View className="flex-row items-center bg-surface rounded-xl p-4 mb-2 border border-border">
        <View 
          className="w-11 h-11 rounded-xl justify-center items-center" 
          style={{ backgroundColor: (expense.category?.color ?? '#333') + '22' }}
        >
          {expense.category?.icon ? (
            <Text className="text-[22px]">{expense.category.icon}</Text>
          ) : (
            <List size={24} color={expense.category?.color ?? colors.primary} />
          )}
        </View>

        <View className="flex-1 ml-3">
          <Text className="text-text font-semibold text-[15px]" numberOfLines={1}>{expense.title}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Text className="text-textSecondary text-[12px]">{expense.category?.name ?? 'Uncategorized'}</Text>
            {formattedDate && (
              <>
                <Text className="text-textSecondary text-[12px]">•</Text>
                <Text className="text-textSecondary text-[11px]">{formattedDate}</Text>
              </>
            )}
          </View>
          {expense.note ? (
            <View className="flex-row items-center mt-1">
              <FileText size={10} className="text-textSecondary mr-1" />
              <Text className="text-textSecondary text-[11px]" numberOfLines={1}>{expense.note}</Text>
            </View>
          ) : null}
        </View>

        <View className="items-end justify-center pr-1">
          <Text className="text-text font-bold text-[15px]">
            {formatCurrency(Number(expense.amount), profile?.currency ?? 'NPR')}
          </Text>
          <Text className="text-textSecondary text-[10px] mt-0.5 uppercase tracking-wider">
            {expense.payment_method}
          </Text>
        </View>
      </View>
    </Swipeable>
  )
}