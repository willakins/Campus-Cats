// CatalogItem.js
import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { getDownloadURL, listAll, ref } from 'firebase/storage';

import { Button } from './ui/Buttons';
import { CatalogEntryObject } from '@/types';
import { storage } from '@/config/firebase';
import DatabaseService from './DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

export const CatalogItem: React.FC<CatalogEntryObject> = ({ id, name, info }) => {
  const router = useRouter();
  const [profileURL, setProfile] = useState<string>('');
  const database = DatabaseService.getInstance();

  const fetchCatImages = async (catName: string) => {
    try {
      const folderRef = ref(storage, `cats/${catName}/`);

      // List all images in the folder
      const result = await listAll(folderRef);

      let profilePicUrl = '';

      for (const itemRef of result.items) {
        const url = await getDownloadURL(itemRef);

        // Check if this is the profile picture
        if (itemRef.name.includes('_profile')) {
          profilePicUrl = url;
          break;
        }
      }
      setProfile(profilePicUrl);
    } catch (error) {
      console.error('Error fetching images: ', error);
    }
  };

  useEffect(() => {
    database.fetchCatImages(name, setProfile);
  }, []);

  // Handle onPress and navigate to the detail page
  const handlePress = () => {
    router.push({
      pathname: '/catalog/view-entry', // Dynamically navigate to the details page
      params: { paramId:id, paramName:name, paramInfo:info }, // Pass the details as query params
    });
  };

  return (
    <Button style={containerStyles.entryContainer} onPress={handlePress}>
      <View style={containerStyles.entryElements}>
        <Text style={textStyles.catalogTitle}>{name}</Text>
        {profileURL ? (<Image source={{ uri: profileURL }} style={containerStyles.listImage} />) : 
          <Text style={textStyles.title}>Loading image...</Text>}
        <Text style={textStyles.catalogDescription}>{info}</Text>
      </View>
    </Button>
  );
};
export default CatalogItem;