import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { AuthCredential, SAMLAuthProvider } from 'firebase/auth';

interface SamlConfiguration {
  readonly apiKey: string | undefined;
  readonly authDomain: string | undefined;
}

export interface SamlCredentialProvider {
  credential(): Promise<AuthCredential | undefined>;
}

export class ExpoSamlCredentialProvider implements SamlCredentialProvider {
  constructor(private readonly configuration: SamlConfiguration) {}

  async credential(): Promise<AuthCredential | undefined> {
    const { apiKey, authDomain } = this.configuration;
    if (!apiKey || !authDomain) {
      throw new Error('Firebase SAML configuration is incomplete');
    }
    const redirectUrl = Linking.createURL('/saml-sign-in');
    const backendUrl = `https://${authDomain}/firebase-wrapper-app.html`;
    const result = await WebBrowser.openAuthSessionAsync(
      `${backendUrl}?linkingUri=${encodeURIComponent(redirectUrl)}&apiKey=${encodeURIComponent(apiKey)}&authDomain=${encodeURIComponent(authDomain)}`,
      redirectUrl,
      {
        dismissButtonStyle: 'cancel',
        enableDefaultShareMenuItem: false,
      },
    );
    if (result.type !== 'success' || !result.url) return undefined;
    const credential = Linking.parse(result.url).queryParams?.credential;
    if (typeof credential !== 'string') {
      throw new Error('SAML redirect did not include a credential');
    }
    return SAMLAuthProvider.credentialFromJSON(JSON.parse(credential));
  }
}
