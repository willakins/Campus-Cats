import { router } from 'expo-router';

import { buttonStyles } from '@/styles';

import { IconButton, IconButtonProps } from './IconButton';

type BackButtonProps = Omit<IconButtonProps, 'icon'>;

export const BackButton = ({ ...props }: BackButtonProps) => {
  return (
    <IconButton
      icon="arrow-back-outline"
      style={buttonStyles.smallButtonTopLeft}
      onPress={router.back}
      {...props}
    />
  );
};
