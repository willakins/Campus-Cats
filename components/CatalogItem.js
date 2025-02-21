// CatalogItem.js
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

const CatalogItem = ({ name, profilePhoto, info }) => {
  return (
    <View style={styles.entryContainer}>
        <Text style={styles.title}>{name}</Text>
        <Image source={{ uri: profilePhoto }} style={styles.image} />
        <Text style={styles.description}>{info}</Text>
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

export default CatalogItem;
