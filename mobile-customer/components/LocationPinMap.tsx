import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { Crosshair, ExternalLink, MapPin, Navigation } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';

interface LocationPinMapProps {
  mode: 'picker' | 'route';
  latitude: number;
  longitude: number;
  pickupLat?: number;
  pickupLng?: number;
  pickupLabel?: string;
  dropoffLabel?: string;
  height?: number;
  onPinChange?: (coords: {
    latitude: number;
    longitude: number;
    city?: string;
    area?: string;
    street?: string;
  }) => void;
}

export const LocationPinMap: React.FC<LocationPinMapProps> = ({
  mode,
  latitude,
  longitude,
  pickupLat,
  pickupLng,
  pickupLabel = 'Restaurant Pickup',
  dropoffLabel = 'Customer Pinned Doorstep',
  height = 220,
  onPinChange,
}) => {
  const { colors, radii } = useTheme();
  const [locating, setLocating] = useState(false);

  const handleUseLiveGps = async () => {
    if (!onPinChange) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));

      let city: string | undefined;
      let area: string | undefined;
      let street: string | undefined;
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (geo[0]) {
          city = geo[0].city ?? geo[0].region ?? undefined;
          area = geo[0].district ?? geo[0].subregion ?? geo[0].name ?? undefined;
          street = geo[0].street ?? geo[0].formattedAddress ?? undefined;
        }
      } catch {
        // Reverse geocode is optional
      }

      onPinChange({ latitude: lat, longitude: lng, city, area, street });
    } catch {
      // Ignore GPS errors cleanly
    } finally {
      setLocating(false);
    }
  };

  const openGoogleMapsNav = () => {
    const url =
      mode === 'route' && typeof pickupLat === 'number' && typeof pickupLng === 'number'
        ? `https://www.google.com/maps/dir/?api=1&origin=${pickupLat},${pickupLng}&destination=${latitude},${longitude}&travelmode=driving`
        : `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    void Linking.openURL(url);
  };

  const leafletHtml = useMemo(() => {
    const safeDropLabel = dropoffLabel.replace(/['"<>&]/g, '');
    const safePickLabel = pickupLabel.replace(/['"<>&]/g, '');
    const hasPickup = mode === 'route' && typeof pickupLat === 'number' && typeof pickupLng === 'number';

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #0F172A; }
    .leaflet-control-attribution { font-size: 9px !important; opacity: 0.65; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var lat = ${latitude};
    var lng = ${longitude};
    var map = L.map('map', { zoomControl: true }).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    var dropIcon = L.divIcon({
      className: 'custom-pin',
      html: '<div style="width:26px;height:26px;border-radius:50%;background:${mode === 'picker' ? '#F47B20' : '#16A34A'};border:3px solid #FFFFFF;box-shadow:0 3px 10px rgba(0,0,0,0.4);"></div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    var marker = L.marker([lat, lng], {
      icon: dropIcon,
      draggable: ${mode === 'picker' ? 'true' : 'false'}
    }).addTo(map).bindPopup('${safeDropLabel}');

    ${
      hasPickup
        ? `
      var pickIcon = L.divIcon({
        className: 'pickup-pin',
        html: '<div style="width:24px;height:24px;border-radius:50%;background:#F47B20;border:3px solid #FFFFFF;box-shadow:0 3px 10px rgba(0,0,0,0.4);"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      var pMarker = L.marker([${pickupLat}, ${pickupLng}], { icon: pickIcon }).addTo(map).bindPopup('${safePickLabel}');
      var line = L.polyline([[${pickupLat}, ${pickupLng}], [lat, lng]], {
        color: '#F47B20',
        weight: 4,
        dashArray: '8, 8'
      }).addTo(map);
      map.fitBounds(line.getBounds(), { padding: [36, 36] });
    `
        : ''
    }

    ${
      mode === 'picker'
        ? `
      function emitPin(newLat, newLng) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: Number(newLat.toFixed(6)), longitude: Number(newLng.toFixed(6)) }));
        }
      }
      marker.on('dragend', function(e) {
        var pos = marker.getLatLng();
        emitPin(pos.lat, pos.lng);
      });
      map.on('click', function(e) {
        marker.setLatLng(e.latlng);
        emitPin(e.latlng.lat, e.latlng.lng);
      });
    `
        : ''
    }
  </script>
</body>
</html>`;
  }, [mode, latitude, longitude, pickupLat, pickupLng, pickupLabel, dropoffLabel]);

  const delta = 0.008;
  const webOsmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${(longitude - delta).toFixed(5)},${(latitude - delta).toFixed(5)},${(longitude + delta).toFixed(5)},${(latitude + delta).toFixed(5)}&layer=mapnik&marker=${latitude.toFixed(5)},${longitude.toFixed(5)}`;

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <MapPin size={16} color={mode === 'picker' ? colors.primary : '#16A34A'} />
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1}>
            {mode === 'picker' ? 'Pin Your Live Location on Map' : 'Customer Pinned Live Location'}
          </Text>
        </View>
        {mode === 'picker' ? (
          <Pressable
            onPress={() => void handleUseLiveGps()}
            disabled={locating}
            style={[styles.gpsBtn, { backgroundColor: colors.primarySoft, borderRadius: radii.md }]}
          >
            {locating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Crosshair size={14} color={colors.primary} />
            )}
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.primary }}>
              {locating ? 'Locating...' : 'Use Live GPS'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={openGoogleMapsNav}
            style={[styles.gpsBtn, { backgroundColor: 'rgba(22,163,74,0.14)', borderRadius: radii.md }]}
          >
            <Navigation size={13} color="#16A34A" />
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#16A34A' }}>Navigate</Text>
            <ExternalLink size={11} color="#16A34A" />
          </Pressable>
        )}
      </View>

      <View style={[styles.mapBox, { height, borderColor: colors.border, borderRadius: radii.lg }]}>
        {Platform.OS === 'web' ? (
          React.createElement('iframe', {
            src: webOsmUrl,
            title: 'Live Location Pin Map',
            style: { width: '100%', height: '100%', border: 0, display: 'block' },
          })
        ) : (
          <WebView
            originWhitelist={['*']}
            source={{ html: leafletHtml }}
            style={{ flex: 1, backgroundColor: '#0F172A' }}
            javaScriptEnabled
            domStorageEnabled
            nestedScrollEnabled
            onMessage={(event) => {
              if (!onPinChange) return;
              try {
                const parsed = JSON.parse(event.nativeEvent.data) as { latitude?: number; longitude?: number };
                if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
                  onPinChange({ latitude: parsed.latitude, longitude: parsed.longitude });
                }
              } catch {
                // Ignore non-JSON messages
              }
            }}
          />
        )}

        <View style={styles.coordPill} pointerEvents="none">
          <View style={[styles.liveDot, { backgroundColor: mode === 'picker' ? '#F47B20' : '#22C55E' }]} />
          <Text style={styles.coordText}>
            {mode === 'picker' ? 'TAP OR DRAG PIN · ' : 'PINNED · '}
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { padding: 12, borderWidth: 1, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mapBox: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  coordPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: { width: 7, height: 7, borderRadius: 999 },
  coordText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '800' },
});
