export class User {
    id:string;
    email:string;
    role:number;
    
    public constructor(id:string, email:string, role:number) {
        this.id = id;
        this.email = email;
        this.role = role;
    }
}