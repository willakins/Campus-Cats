import { Text, TextProps } from 'react-native';

import { textStyles } from '@/styles';

type ErrorTextProps = Omit<TextProps, 'children'> & {
  error?: string;
};

export const ErrorText: React.FC<ErrorTextProps> = ({
  error,
  style,
  ...props
}) => {
  const style_ = [textStyles.errorText, style];

  if (!error) {
    return <></>;
  }

  return (
    <Text style={style_} {...props}>
      {error}
    </Text>
  );
};
