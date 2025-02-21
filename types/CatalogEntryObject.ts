import { LatLng } from "react-native-maps";

export interface CatalogEntryObject {
    id: string;
    name: string;
    profilePhoto: string; //path to storage with photo
    info: string;
    most_recent_sighting: LatLng; // document id for a cat sighting 
}