export class AnnouncementEntryObject {
    id: string;
    title: string;
    info: string;
    createdAt:string;
    createdBy:string;

    constructor(id: string, title: string, info: string, createdAt: string, createdBy:string) {
        this.id = id;
        this.title = title;
        this.info = info;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
    }
}