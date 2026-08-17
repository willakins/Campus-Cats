import '@testing-library/react-native';

Object.assign(process.env, {
  EXPO_PUBLIC_API_KEY: 'native-api-key',
  EXPO_PUBLIC_APP_ENV: 'development',
  EXPO_PUBLIC_APP_ID: '1:811658613482:web:nativefixture',
  EXPO_PUBLIC_AUTH_DOMAIN: 'campus-cats-development.firebaseapp.com',
  EXPO_PUBLIC_MESSAGING_SENDER_ID: '811658613482',
  EXPO_PUBLIC_PROJECT_ID: 'campus-cats-development',
  EXPO_PUBLIC_STORAGE_BUCKET:
    'campus-cats-development.firebasestorage.app',
  EXPO_PUBLIC_WEB_API_KEY: 'web-api-key',
  EXPO_PUBLIC_WEB_APP_ID: '1:811658613482:web:webfixture',
});

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapView = React.forwardRef(
    ({ children, ...props }: { children?: React.ReactNode }, ref: React.Ref<unknown>) =>
      React.createElement(View, { ...props, ref }, children),
  );
  MapView.displayName = 'MockMapView';
  const Marker = ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement(View, props, children);

  return {
    __esModule: true,
    default: MapView,
    Marker,
    PROVIDER_GOOGLE: 'google',
  };
});
