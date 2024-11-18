import React, { useEffect, useState } from "react";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase"; // Import your firebase config
import { FlatList, Text, StyleSheet, View, Image } from 'react-native';

export default function Catalog() {
  const [photoUrls, setPhotoUrls] = useState<string[] | null>([]);

    // Function to retrieve photos from Firebase Storage
    const fetchPhotos = async () => {
      const folderPath = "photos"; // Specify your folder in Firebase Storage
      const folderRef = ref(storage, folderPath);

      try {
        // List all files in the folder
        const result = await listAll(folderRef);

        // Get download URLs for all the files
        const urls = await Promise.all(
          result.items.map((itemRef) => getDownloadURL(itemRef))
        );

        // Update state with the list of photo URLs
        setPhotoUrls(urls);
      } catch (error) {
        console.error("Error fetching photos from Firebase Storage: ", error);
      }
    };

    useEffect(() => {
      fetchPhotos(); // Fetch photos when the screen is loaded
    }, []);
    const data = Array.from({ length: 50 }, (_, i) => `Item ${i + 1}`);
  return (
    <FlatList
      data={photoUrls}
      keyExtractor={(_item, index) => index.toString()}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Image source={{ uri: item }} style={styles.image} />
          <Text style={styles.text}>Grumpus the cat</Text>
        </View>
      )}
      contentContainerStyle={styles.list}
    />
  );
}
const styles = StyleSheet.create({
    list: {
      padding: 16,
    },
    item: {
      marginBottom: 16,
      padding: 20,
      backgroundColor: '#fff',
      borderRadius: 8,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 3,
      flexDirection: 'row', // Align items horizontally
      alignItems: "center",
      justifyContent: 'center',
    },
    photoContainer: {
      flexDirection: 'row', // Align items horizontally
      marginBottom: 15,
      alignItems: "center",
      justifyContent: 'center',
    },
    image: {
      width: '50%', // Take up the full width of the container
      aspectRatio: 16 / 9, // Maintain a 16:9 aspect ratio
      borderRadius: 10,
      marginRight: 10,
    },
    container: {
      flexDirection: 'row', // Align items horizontally
      alignItems: 'center', // Vertically center the image and text
    },
    text: {
      fontSize: 15,
      marginRight: 50,
    },
  });
