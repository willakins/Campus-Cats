import {
  Switch as RNSwitch,
  SwitchProps as RNSwitchProps,
  Text,
  TextStyle,
  View,
} from 'react-native';

import {
  buttonStyles,
  containerStyles,
  globalStyles,
  textStyles,
} from '@/styles';

export type SwitchProps = RNSwitchProps & {
  label: string;
  labelStyle?: TextStyle;
};

export const Switch: React.FC<SwitchProps> = ({
  label,
  labelStyle,
  value,
  onValueChange,
  ...props
}) => {
  const style_ = [textStyles.detail, labelStyle];

  return (
    <>
      <View style={containerStyles.card}>
        <RNSwitch value={value} onValueChange={onValueChange} {...props} />
        {label ? (
          <Text style={[style_, { marginLeft: 12 }]}>{label}</Text>
        ) : null}
      </View>
    </>
  );
};
