import { useAuth } from '@/providers';
import { ViewProps } from 'react-native';

export const AdminView: React.FC<ViewProps> = ({
  children,
}) => {
  const { user } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;

  return (
    <>
      {isAdmin && children}
    </>
  );
};
