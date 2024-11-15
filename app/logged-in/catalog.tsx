import { FlatList, Text, StyleSheet, View } from 'react-native';

export default function Catalog() {
    const data = Array.from({ length: 50 }, (_, i) => `Item ${i + 1}`);
  return (
    <FlatList
      data={data}
      keyExtractor={(_item, index) => index.toString()}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Text>{item}</Text>
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
    },
  });