import { Switch as RNSwitch, SwitchProps as RNSwitchProps, Text, TextStyle, View } from 'react-native';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

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
  const style_ = [textStyles.sliderText, labelStyle];

  return (
    <>
      <View style={containerStyles.sliderContainer}>
        <RNSwitch value={value} onValueChange={onValueChange} {...props} />
        {label ? <Text style={style_}>{label}</Text> : null}
      </View>
    </>
  );
};
