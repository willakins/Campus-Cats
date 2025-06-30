interface UserProps {
  id: string;
  email: string;
  role: number;
}
class User {
  id: string;
  email: string;
  role: number;

  public constructor({ id, email, role }: UserProps) {
    this.id = id;
    this.email = email;
    this.role = role;
  }

  static readonly dummy = new User({
    id: 'dummy',
    email: 'dummy',
    role: 0,
  });
}
export { User, UserProps };
