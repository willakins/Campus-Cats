import { TouchableOpacity, TouchableOpacityProps } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { buttonStyles } from '@/styles';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export interface IconButtonProps
  extends React.PropsWithoutRef<TouchableOpacityProps> {
  icon: IoniconsName;
  size?: number;
  iconColor?: string;
}

export const IconButton = ({
  icon,
  size = 25,
  iconColor = '#fff',
  style,
  onPress,
  ...props
}: IconButtonProps) => {
  return (
    <TouchableOpacity
      style={[buttonStyles.button, style]}
      onPress={onPress}
      {...props}
    >
      <Ionicons name={icon} size={size} color={iconColor} />
    </TouchableOpacity>
  );
};
