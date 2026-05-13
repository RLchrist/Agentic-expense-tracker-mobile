import { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImageManipulator from 'expo-image-manipulator'
import { COLORS, SPACING } from '../../constants'
import { parseExpenseFromText } from '../../services/ai/parseExpense'
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

  if (!permission) return <View style={styles.container} />

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionEmoji}>📷</Text>
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan receipts
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (parsed) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.previewContainer}>
          <Text style={styles.previewTitle}>✨ Receipt Scanned!</Text>
          <View style={styles.previewCard}>
            <PreviewRow label="📝 Title" value={parsed.title} />
            <PreviewRow label="💰 Amount" value={`Rs. ${parsed.amount}`} highlight />
            <PreviewRow label="🏷️ Category" value={parsed.category_name} />
            <PreviewRow label="📅 Date" value={parsed.expense_date} />
            <PreviewRow label="💳 Payment" value={parsed.payment_method} />
            {parsed.note && <PreviewRow label="📌 Note" value={parsed.note} />}
          </View>
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => setParsed(null)}
            >
              <Text style={styles.retryText}>← Rescan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.saveBtnText}>Save ✓</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back" ref={cameraRef}>
        {/* Overlay */}
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          {/* Scan frame */}
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            {scanning && (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator color={COLORS.primary} size="large" />
                <Text style={styles.scanningText}>Reading receipt...</Text>
              </View>
            )}
          </View>

          <Text style={styles.hint}>Position receipt within the frame</Text>

          {/* Capture button */}
          <TouchableOpacity
            style={[styles.captureBtn, scanning && { opacity: 0.5 }]}
            onPress={handleCapture}
            disabled={scanning}
          >
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  )
}

function PreviewRow({ label, value, highlight }: {
  label: string; value: string; highlight?: boolean
}) {
  return (
    <View style={previewStyles.row}>
      <Text style={previewStyles.label}>{label}</Text>
      <Text style={[previewStyles.value, highlight && previewStyles.highlight]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'space-between', padding: SPACING.lg, paddingBottom: 40 },
  closeBtn: {
    alignSelf: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { color: COLORS.white, fontSize: 18 },
  scanFrame: {
    alignSelf: 'center', width: 280, height: 200,
    borderRadius: 12, position: 'relative', justifyContent: 'center', alignItems: 'center',
  },
  corner: {
    position: 'absolute', width: 24, height: 24,
    borderColor: COLORS.primary, borderWidth: 3,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scanningOverlay: { alignItems: 'center', gap: SPACING.sm },
  scanningText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  hint: { color: 'rgba(255,255,255,0.8)', textAlign: 'center', fontSize: 14 },
  captureBtn: {
    alignSelf: 'center', width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: COLORS.white,
  },
  captureBtnInner: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: COLORS.white,
  },
  permissionBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md, padding: SPACING.xl },
  permissionEmoji: { fontSize: 64 },
  permissionTitle: { color: COLORS.text, fontSize: 22, fontWeight: 'bold' },
  permissionText: { color: COLORS.textSecondary, textAlign: 'center', fontSize: 15 },
  permissionBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
  },
  permissionBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  cancelText: { color: COLORS.textSecondary, fontSize: 15 },
  previewContainer: { padding: SPACING.lg, gap: SPACING.md },
  previewTitle: { color: COLORS.text, fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  previewCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  previewActions: { flexDirection: 'row', gap: SPACING.sm },
  retryBtn: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 12,
    padding: SPACING.md, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  retryText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: {
    flex: 2, backgroundColor: COLORS.primary,
    borderRadius: 12, padding: SPACING.md, alignItems: 'center',
  },
  saveBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
})

const previewStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: SPACING.xs, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  label: { color: COLORS.textSecondary, fontSize: 14 },
  value: { color: COLORS.text, fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },
  highlight: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold' },
})