// useState setter function type
export type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

export { handleFirebaseAuthError } from './firebase';
export { uploadFromURI } from './storage';
