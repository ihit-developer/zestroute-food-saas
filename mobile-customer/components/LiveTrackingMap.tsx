import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bike, ExternalLink, MapPin, Navigation, Phone, Star, Store } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';

export interface LiveDeliveryMapData {
  deliveryId: string;
  status: string;
  riderName: string | null;
  riderPhone: string | null;
  vehicleType: string | null;
  vehicleNumber: string | null;
  riderRating: number;
  distanceKm: number;
  pickupLocation: { lat: number; lng: number; name: string; address: string };
  dropoffLocation: { lat: number; lng: number; address: string };
  riderLocation: { lat: number; lng: number; updatedAt: string } | null;
}

interface LiveTrackingMapProps {
  delivery: LiveDeliveryMapData;
}

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({ delivery }) => {
  const { colors, radii } = useTheme();
  const focusLat = delivery.riderLocation?.lat ?? delivery.pickupLocation.lat;
  const focusLng = delivery.riderLocation?.lng ?? delivery.pickupLocation.lng;

  const delta = 0.015;
  const bbox = `${(focusLng - delta).toFixed(5)},${(focusLat - delta).toFixed(5)},${(focusLng + delta).toFixed(5)},${(focusLat + delta).toFixed(5)}`;
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${focusLat.toFixed(5)},${focusLng.toFixed(5)}`;

  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${delivery.pickupLocation.lat},${delivery.pickupLocation.lng}&destination=${delivery.dropoffLocation.lat},${delivery.dropoffLocation.lng}&travelmode=driving`;
    void Linking.openURL(url);
  };

  const callRider = () => {
    if (!delivery.riderPhone) return;
    void Linking.openURL(`tel:${delivery.riderPhone}`);
  };

  const progressRatio =
    delivery.status === 'delivered'
      ? 100
      : delivery.status === 'on_the_way'
        ? 72
        : delivery.status === 'picked_up'
          ? 48
          : delivery.status === 'assigned'
            ? 24
            : 8;

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Navigation size={16} color={colors.primary} />
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
            Live GPS Delivery Map
          </Text>
        </View>
        <Pressable onPress={openGoogleMaps} style={styles.extLink}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Open Maps</Text>
          <ExternalLink size={13} color={colors.primary} />
        </Pressable>
      </View>

      {/* Interactive OSM Map on Web + Live Route Canvas on Native */}
      {Platform.OS === 'web' ? (
        <View style={[styles.mapFrame, { borderRadius: radii.lg, borderColor: colors.border }]}>
          {React.createElement('iframe', {
            src: osmUrl,
            title: 'Live Rider GPS Map',
            style: { width: '100%', height: 210, border: 0, display: 'block' },
            loading: 'lazy',
          })}
          <View style={styles.mapOverlayBadge}>
            <View style={styles.liveDot} />
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
              GPS {focusLat.toFixed(4)}, {focusLng.toFixed(4)} · {delivery.distanceKm} km
            </Text>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.nativeMapCanvas,
            { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.lg },
          ]}
        >
          <View style={styles.routeTrackRow}>
            <View style={[styles.pinNode, { backgroundColor: colors.primarySoft }]}>
              <Store size={16} color={colors.primary} />
            </View>
            <View style={[styles.routeBar, { backgroundColor: colors.border }]}>
              <View style={[styles.routeFill, { backgroundColor: colors.primary, width: `${progressRatio}%` }]} />
              <View style={[styles.riderDot, { left: `${Math.min(progressRatio, 90)}%`, backgroundColor: '#16A34A' }]}>
                <Bike size={12} color="#FFFFFF" />
              </View>
            </View>
            <View style={[styles.pinNode, { backgroundColor: 'rgba(22,163,74,0.14)' }]}>
              <MapPin size={16} color="#16A34A" />
            </View>
          </View>
          <View style={styles.coordRow}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
              {delivery.pickupLocation.name}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#16A34A' }}>
              LIVE GPS · {focusLat.toFixed(4)}, {focusLng.toFixed(4)}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
              Your Door
            </Text>
          </View>
        </View>
      )}

      {/* Assigned Rider Contact Card */}
      {delivery.riderName ? (
        <View
          style={[
            styles.riderCard,
            { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.lg },
          ]}
        >
          <View style={[styles.riderAvatar, { backgroundColor: 'rgba(22,163,74,0.14)' }]}>
            <Bike size={18} color="#16A34A" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                {delivery.riderName}
              </Text>
              {delivery.riderRating > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Star size={12} color="#F59E0B" fill="#F59E0B" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
                    {delivery.riderRating.toFixed(1)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              {(delivery.vehicleType ?? 'Bike').toUpperCase()}
              {delivery.vehicleNumber ? ` · ${delivery.vehicleNumber}` : ''} · {delivery.distanceKm} km away
            </Text>
          </View>
          {delivery.riderPhone ? (
            <Pressable
              onPress={callRider}
              style={[styles.callBtn, { backgroundColor: '#16A34A', borderRadius: radii.md }]}
            >
              <Phone size={15} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Call</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          Assigning nearest available rider to {delivery.pickupLocation.name}...
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { padding: 14, borderWidth: 1, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  extLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mapFrame: { overflow: 'hidden', borderWidth: 1, position: 'relative' },
  mapOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: '#22C55E' },
  nativeMapCanvas: { padding: 16, borderWidth: 1, gap: 14 },
  routeTrackRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pinNode: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  routeBar: { flex: 1, height: 6, borderRadius: 999, position: 'relative', justifyContent: 'center' },
  routeFill: { height: '100%', borderRadius: 999 },
  riderDot: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -12,
  },
  coordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  riderCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1 },
  riderAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8 },
});
