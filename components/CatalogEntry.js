// CatalogEntry.js
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

const CatalogEntry = ({ name, profilePhoto, info, recentSighting, extraPhotos  }) => {
  return (
    <View style={styles.entryContainer}>
        <Text style={styles.title}>{name}</Text>
        <Image source={{ uri: profilePhoto }} style={styles.image} />
        <Text style={styles.description}>{info}</Text>
        <MapView
            style={{ width: '100%', height: 200, marginVertical: 10 }}
            initialRegion={{
              latitude: 33.7756, // Default location (e.g., Georgia Tech)
              longitude: -84.3963,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            {recentSighting && <Marker coordinate={recentSighting} />}
        </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  entryContainer: {
    flexDirection: 'row',
    margin: 10,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  image: {
    width: 80,
    height: 80,
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#555',
  },
});

export default CatalogEntry;
