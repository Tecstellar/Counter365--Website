# Counter 365: WhatsApp Web-Style QR Pairing Protocol & Android Integration Guide

This document describes the cryptographic QR pairing protocol used to authenticate the **Counter 365 Web** application from an authenticated **Counter Pro Android** device, along with the step-by-step instructions for adding the mobile scanner component to the Android codebase without breaking backward compatibility.

---

## 1. Architectural Overview

The pairing architecture mirrors the security model of WhatsApp Web:

```
+-------------------+                          +-------------------------+                          +--------------------+
|  Counter 365 Web  |                          |    Supabase Realtime    |                          | Counter Pro Android|
|  (Unauthenticated)|                          |     Broadcast Channel   |                          |  (Authenticated)   |
+---------+---------+                          +------------+------------+                          +---------+----------+
          |                                                 |                                                 |
          |  1. Generate Session UUID & Secret              |                                                 |
          |  2. Join channel: "qr-pairing:{sessionId}"      |                                                 |
          |  3. Display QR Code: {sessionId, secret, exp}  |                                                 |
          |------------------------------------------------>|                                                 |
          |                                                 |                                                 |
          |                                                 |        4. Scan QR with Camera Screen            |
          |                                                 |           (Reads sessionId & secret)            |
          |                                                 |<------------------------------------------------|
          |                                                 |                                                 |
          |                                                 |        5. Verify session not expired            |
          |                                                 |        6. Prompt merchant: "Pair Web Session?"  |
          |                                                 |        7. On user approval:                     |
          |                                                 |           Broadcast "approve_pairing" with      |
          |                                                 |           { profile, shop, sessionToken }       |
          |                                                 |<------------------------------------------------+
          |                                                 |
          |  8. Receive "approve_pairing" event             |
          |  9. Verify secret token matches                 |
          | 10. Persist profile, shop, and active member    |
          | 11. Navigate to /dashboard                      |
          |<------------------------------------------------|
```

---

## 2. Web Side Implementation Details

The web application manages QR sessions via `src/services/qrPairingService.ts`:

- **Session Generation**:
  - `sessionId`: Cryptographically secure RFC4122 v4 UUID (`crypto.randomUUID()`).
  - `secret`: High-entropy 128-bit hex authentication token.
  - `expiresAt`: Current timestamp + 120 seconds (2-minute window).
- **Channel**:
  - Uses Supabase Realtime: `supabase.channel(`qr-pairing:${sessionId}`)`.
- **Payload displayed in QR**:
  ```json
  {
    "type": "counter365_qr_login",
    "version": "1.0",
    "sessionId": "4f9d2a6b-8c31-4e2a-92f7-3e81b6df102a",
    "secret": "9a8f7c6e5d4c3b2a10fe...",
    "expiresAt": 1793339000000
  }
  ```
- **Session Auto-Refresh**: If the 2-minute timer expires before approval, the web application clears the old channel and generates a fresh pairing QR code.

---

## 3. Security Specifications

1. **Ephemeral Tokens**: QR pairing codes are strictly valid for 120 seconds.
2. **Single-Use**: Once an `approve_pairing` event is accepted by the web client, the Realtime channel is immediately unsubscribed and destroyed.
3. **Existing Accounts Only**: The Android client must reject any unauthenticated pairing attempts. Unregistered users cannot be authenticated via QR.
4. **No Plaintext Passwords or Secret Keys in QR**: The QR code only contains an ephemeral session reference and validation challenge.
5. **Replay Protection**: The web client verifies that the returned session signature matches the generated secret.

---

## 4. Mobile Integration Guide (Counter Pro Android)

> **Note**: The Android repository is currently READ-ONLY. When ready to update the Android app, implement the following steps.

### Step 1: Install Camera & Barcode Scanner

In `Counterpro-android`:
```bash
npx expo install expo-camera expo-barcode-scanner
```

### Step 2: Create `src/screens/account/ScanWebQrScreen.tsx`

```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';

export function ScanWebQrScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const { profile } = useAuth();
  const { currentShop } = useShop();

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>Camera permission is required to scan the Web QR code.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const payload = JSON.parse(data);
      if (payload.type !== 'counter365_qr_login' || !payload.sessionId) {
        Alert.alert('Invalid QR', 'This is not a valid Counter 365 pairing QR code.', [
          { text: 'OK', onPress: () => setScanned(false) }
        ]);
        return;
      }

      if (Date.now() > payload.expiresAt) {
        Alert.alert('Expired QR', 'This pairing QR code has expired. Please refresh the web page.', [
          { text: 'OK', onPress: () => setScanned(false) }
        ]);
        return;
      }

      Alert.alert(
        'Confirm Web Login',
        `Log in to Counter 365 Web for "${currentShop?.name || 'Your Shop'}"?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setScanned(false) },
          {
            text: 'Approve',
            onPress: async () => {
              const channel = supabase.channel(`qr-pairing:${payload.sessionId}`);
              await channel.subscribe();
              await channel.send({
                type: 'broadcast',
                event: 'approve_pairing',
                payload: {
                  secret: payload.secret,
                  profile: profile,
                  shop: currentShop,
                  approvedAt: Date.now()
                }
              });
              await channel.unsubscribe();
              Alert.alert('Success', 'Web session authorized successfully!');
              navigation.goBack();
            }
          }
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to parse QR code.', [
        { text: 'OK', onPress: () => setScanned(false) }
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />
      <View style={styles.overlay}>
        <Text style={styles.instructions}>Point camera at the QR code on your computer screen</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  btn: { marginTop: 16, backgroundColor: '#FF5F00', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  overlay: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.7)', padding: 16, borderRadius: 12 },
  instructions: { color: '#FFF', textAlign: 'center', fontSize: 14 }
});
```

### Step 3: Add "Link Web Device" Button in Android Settings

In `Counterpro-android/src/screens/account/AccountSettingsScreen.tsx`:
```tsx
<TouchableOpacity 
  style={styles.settingItem} 
  onPress={() => navigation.navigate('ScanWebQrScreen')}
>
  <QrCode size={22} color="#FF5F00" />
  <Text style={styles.settingText}>Link Counter 365 Web (QR Scan)</Text>
</TouchableOpacity>
```
