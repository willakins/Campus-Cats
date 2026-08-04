import { MapStyleElement } from 'react-native-maps';

// Google-compatible styling is intentionally the only non-palette color definition.
export const campusMapDarkStyle: readonly MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#1C2730' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#D7D5CE' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1C2730' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#475762' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#17222B' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#203128' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1D382B' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#34434E' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1D2831' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#66552B' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2A3944' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#102C3B' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#78C6E5' }] },
] as const;
