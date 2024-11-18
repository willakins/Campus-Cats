import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";


export default function Index() {
    const router = useRouter();

    function validate() {
        router.push('/logged-in')
        return;
    }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text> Log-in</Text>
      <TouchableOpacity style={styles.captureButton} onPress={validate}>
        <View style={styles.innerCircle} />
          </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
    },
    message: {
      textAlign: 'center',
      paddingBottom: 10,
    },
    topBar: {
      position: 'absolute',
      top: 40,
      left: 20,
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
    },
    flipButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: 10,
      borderRadius: 20,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 40,
      left: 0,
      right: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    captureButton: {
      width: 70,
      height: 70,
      backgroundColor: '#fff',
      borderRadius: 35,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 5,
      borderColor: '#d9d9d9',
    },
    innerCircle: {
      width: 55,
      height: 55,
      backgroundColor: '#fff',
      borderRadius: 27.5,
    },
    preview: {
      position: 'absolute',
      bottom: 10,
      left: 10,
      right: 10,
      alignItems: 'center',
      backgroundColor: '#000',
      padding: 10,
      borderRadius: 10,
    },
    previewText: {
      color: '#fff',
      marginBottom: 10,
    },
    image: {
      width: 200,
      height: 300,
      resizeMode: 'contain',
    },
  });
