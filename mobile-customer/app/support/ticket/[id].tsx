import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { EmptyState, IconButton, InputField, TopNav, useToast } from '../../../components/ui';

export default function SupportChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [message, setMessage] = useState('');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <TopNav
        title={`Ticket ${id ?? ''}`}
        subtitle="In-App Support Chat"
        leftAction={
          <IconButton
            icon={<ArrowLeft size={18} color={colors.textPrimary} />}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <EmptyState
          title="Support Conversation"
          description="Live support messages sync via Socket.IO in Phase 13."
        />
      </ScrollView>

      <View style={[styles.composer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <InputField
            placeholder="Type a message..."
            value={message}
            onChangeText={setMessage}
          />
        </View>
        <IconButton
          icon={<Send size={18} color={colors.primary} />}
          accessibilityLabel="Send message"
          onPress={() => {
            if (!message.trim()) return;
            setMessage('');
            showToast('Support chat connects in Phase 13', 'info');
          }}
        />
        <Text style={{ width: 0 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, flexGrow: 1, justifyContent: 'center' },
  composer: { padding: 12, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
