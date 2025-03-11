export class AnnouncementEntryObject {
    id: string;
    title: string;
    info: string;
    photos: string;
    createdAt:string;

    constructor(id: string, title: string, info: string, photos: string, createdAt: string) {
        this.id = id;
        this.title = title;
        this.info = info;
        this.photos = photos;
        this.createdAt = createdAt;
    }
}