import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

class PhotoHandler {
  constructor(onPhotoSelected) {
    this.onPhotoSelected = onPhotoSelected;
  }

  async handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      alert("Sorry, we need camera roll permissions to make this work!");
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      quality: 1.0, // 100% quality, do not compress
    });

    if (!result.canceled) {
      this.onPhotoSelected(result.assets[0].uri);
    }
  }

  async handleSelectPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Sorry, we need media library permissions to make this work!");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      quality: 1.0, // 100% quality, do not compress
    });

    if (!result.canceled) {
      this.onPhotoSelected(result.assets[0].uri);
    }
  }

  handlePress() {
    Alert.alert(
      "Select Option",
      "Would you like to take a photo or select from your library?",
      [
        {
          text: "Take Photo",
          onPress: () => this.handleTakePhoto(),
        },
        {
          text: "Choose from Library",
          onPress: () => this.handleSelectPhoto(),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  }
}

export { PhotoHandler };
