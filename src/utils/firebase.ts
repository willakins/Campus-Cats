export const handleFirebaseAuthError = (errorCode: string) => {
  switch (errorCode) {
    case 'auth/email-already-exists':
    case 'auth/email-already-in-use':
      return 'Email already in use. Please use another.';
    case 'auth/user-not-found':
      return 'No user found with this email.';
    case 'auth/invalid-credential':
      // Firebase now often returns this instead of user-not-found
      return 'Login failed. Incorrect email or password.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-email':
      return 'Invalid email format.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/internal-error':
      return 'Internal error. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      console.warn('Unhandled auth error:', errorCode);
      return 'Login failed.';
  }
};
