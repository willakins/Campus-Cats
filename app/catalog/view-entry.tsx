import CatalogEntry from "@/components/CatalogEntry";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, ScrollView} from 'react-native';
import { CatalogEntryObject } from '@/types/CatalogEntryObject';
import { LatLng } from "react-native-maps";

const view_entry = () =>{
    const { paramId, paramName, paramProfile, paramInfo, paramSighting, paramExtraPhotos} = useLocalSearchParams();
    const id = paramId as string;
    const name = paramName as string;
    const profilePhoto = paramProfile as string;
    const info = paramInfo as string;
    const most_recent_sighting:LatLng = JSON.parse(paramSighting as string);
    const extraPhotos = paramExtraPhotos as string;
    const entry:CatalogEntryObject = {id, name, profilePhoto, info, most_recent_sighting, extraPhotos};
    
    return (
          <ScrollView contentContainerStyle={styles.scrollView}>
              <CatalogEntry
                id={entry.id}
                name={entry.name}
                profilePhoto={entry.profilePhoto}
                info={entry.info}
                most_recent_sighting={entry.most_recent_sighting}
                extraPhotos={entry.extraPhotos}
                />
          </ScrollView>
        
      );
}

export default view_entry;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F9',
    paddingTop: 20,
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    marginTop: 20,
    textAlign: 'center',
  },
  scrollView: {
    padding: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F9',
  },
});