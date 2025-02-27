import { Slot } from 'expo-router';

import { AuthProvider } from '@/providers';

const RootLayout = () => {
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
};

export default RootLayout;
