import { useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImageManipulator from 'expo-image-manipulator'
import { 
  Camera, Sparkles, FileText, Wallet, Tag, 
  Calendar, CreditCard, Pin, X, ArrowLeft, Check 
} from 'lucide-react-native'

import { useExpenseStore } from '../../store/expenseStore'
import { ParsedExpense } from '../../services/ai/parseExpense'

export default function ReceiptScannerScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanning, setScanning] = useState(false)
  const [parsed, setParsed] = useState<ParsedExpense | null>(null)
  const [saving, setSaving] = useState(false)
  const cameraRef = useRef<CameraView>(null)
  const { categories, addExpense } = useExpenseStore()

  const handleCapture = async () => {
    if (!cameraRef.current) return
    setScanning(true)

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 })
      if (!photo) throw new Error('No photo captured')

      // Compress image
      const compressed = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      )

      // Convert to base64
      const response = await fetch(compressed.uri)
      const blob = await response.blob()
      const reader = new FileReader()

      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1]

        // Use the AI Router (Online with Offline fallback)
        const { aiRouter } = await import('../../services/ai/aiRouter')
        const result = await aiRouter.parseReceipt(compressed.uri, categories)

        if (!result.success) {
          // Fallback — ask user to type
          Alert.alert(
            result.source === 'offline' ? 'Offline Mode' : 'OCR tip',
            result.error || 'Could not auto-read receipt. Please describe it manually.',
            [{ text: 'OK', onPress: () => navigation.navigate('AddExpense') }]
          )
          setScanning(false)
          return
        }

        setParsed(result.data)
        setScanning(false)
      }

      reader.readAsDataURL(blob)
    } catch (e) {
      console.error(e)
      Alert.alert('Error', 'Could not process receipt')
      setScanning(false)
    }
  }

  const handleSave = async () => {
    if (!parsed) return
    setSaving(true)
    await addExpense({
      title: parsed.title,
      amount: parsed.amount,
      currency: 'NPR',
      category_id: parsed.category_id,
      note: parsed.note,
      receipt_url: null,
      expense_date: parsed.expense_date,
      payment_method: parsed.payment_method,
      is_synced: true,
      local_id: null,
    })
    setSaving(false)
    Alert.alert('Saved!', 'Expense added from receipt', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ])
  }

  if (!permission) return <View className="flex-1 bg-background" />

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center gap-4 p-8">
          <Camera size={64} className="text-textSecondary" />
          <Text className="text-text text-[22px] font-bold">Camera Access Needed</Text>
          <Text className="text-textSecondary text-center text-[15px]">
            We need camera access to scan receipts
          </Text>
          <TouchableOpacity className="bg-primary rounded-xl px-8 py-4" onPress={requestPermission}>
            <Text className="text-white font-bold text-base">Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text className="text-textSecondary text-[15px]">Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (parsed) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="p-6 gap-4">
          <View className="flex-row items-center justify-center gap-2">
            <Sparkles size={24} className="text-primary" />
            <Text className="text-text text-[22px] font-bold text-center">Receipt Scanned!</Text>
          </View>
          <View className="bg-surface rounded-2xl p-4 border border-border">
            <PreviewRow icon={<FileText size={16} className="text-textSecondary" />} label="Title" value={parsed.title} />
            <PreviewRow icon={<Wallet size={16} className="text-primary" />} label="Amount" value={`Rs. ${parsed.amount}`} highlight />
            <PreviewRow icon={<Tag size={16} className="text-textSecondary" />} label="Category" value={parsed.category_name} />
            <PreviewRow icon={<Calendar size={16} className="text-textSecondary" />} label="Date" value={parsed.expense_date} />
            <PreviewRow icon={<CreditCard size={16} className="text-textSecondary" />} label="Payment" value={parsed.payment_method} />
            {parsed.note && <PreviewRow icon={<Pin size={16} className="text-textSecondary" />} label="Note" value={parsed.note} />}
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="flex-1 bg-surface rounded-xl p-4 items-center border border-border flex-row justify-center gap-2"
              onPress={() => setParsed(null)}
            >
              <ArrowLeft size={16} className="text-textSecondary" />
              <Text className="text-textSecondary font-semibold">Rescan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-[2] bg-primary rounded-xl p-4 items-center flex-row justify-center gap-2 ${saving ? 'opacity-70' : ''}`}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator className="text-white" />
                : (
                  <>
                    <Check size={18} className="text-white" />
                    <Text className="text-white font-bold text-base">Save</Text>
                  </>
                )
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <View className="flex-1 bg-background">
      <CameraView className="flex-1" facing="back" ref={cameraRef}>
        {/* Overlay */}
        <View className="flex-1 justify-between p-6 pb-10">
          <TouchableOpacity className="self-end bg-black/50 w-10 h-10 rounded-full justify-center items-center" onPress={() => navigation.goBack()}>
            <X size={24} className="text-white" />
          </TouchableOpacity>

          {/* Scan frame */}
          <View className="self-center w-[280px] h-[200px] rounded-xl relative justify-center items-center">
            <View className="absolute top-0 left-0 border-primary border-l-[3px] border-t-[3px] w-6 h-6 rounded-tl-lg" />
            <View className="absolute top-0 right-0 border-primary border-r-[3px] border-t-[3px] w-6 h-6 rounded-tr-lg" />
            <View className="absolute bottom-0 left-0 border-primary border-l-[3px] border-b-[3px] w-6 h-6 rounded-bl-lg" />
            <View className="absolute bottom-0 right-0 border-primary border-r-[3px] border-b-[3px] w-6 h-6 rounded-br-lg" />
            {scanning && (
              <View className="items-center gap-2">
                <ActivityIndicator className="text-primary" size="large" />
                <Text className="text-white text-sm font-semibold">Reading receipt...</Text>
              </View>
            )}
          </View>

          <Text className="text-white/80 text-center text-sm">Position receipt within the frame</Text>

          {/* Capture button */}
          <TouchableOpacity
            className={`self-center w-[72px] h-[72px] rounded-full bg-white/30 justify-center items-center border-[3px] border-white ${scanning ? 'opacity-50' : ''}`}
            onPress={handleCapture}
            disabled={scanning}
          >
            <View className="w-[54px] h-[54px] rounded-full bg-white" />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  )
}

function PreviewRow({ icon, label, value, highlight }: {
  icon: any; label: string; value: string; highlight?: boolean
}) {
  return (
    <View className="flex-row justify-between py-2 border-b border-border">
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="text-textSecondary text-sm">{label}</Text>
      </View>
      <Text className={`text-sm font-medium flex-1 text-right ${highlight ? 'text-primary text-lg font-bold' : 'text-text'}`}>{value}</Text>
    </View>
  )
}