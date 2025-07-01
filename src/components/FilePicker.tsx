import { Image, StyleSheet } from 'react-native';

import { CameraButton } from '@/components/ui/Buttons';

type FilePickerProps = {
  uri: string;
  onChange: (fileURIs: string) => void; // TODO: Fix this to return an array of strings
  disabled?: boolean;
};

export const FilePicker: React.FC<FilePickerProps> = ({
  uri,
  onChange,
  disabled,
}) => {
  return (
    <>
      {disabled || <CameraButton onPhotoSelected={onChange} />}
      {uri ? (
        <Image source={{ uri: uri }} style={styles.selectedPreview} />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  selectedPreview: {
    margin: 'auto', // Center the image
    objectFit: 'scale-down', // Don't clip the image
    width: 240,
    height: 180,
  },
});
