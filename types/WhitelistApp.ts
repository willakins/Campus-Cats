export class WhitelistApp {
  id: string;
  name: string;
  graduationYear: string;
  email: string;
  codeWord: string;

  constructor(
    id: string,
    name: string,
    graduationYear: string,
    email: string,
    codeWord: string,
  ) {
    this.id = id;
    this.name = name;
    this.graduationYear = graduationYear;
    this.email = email;
    this.codeWord = codeWord;
  }
}
