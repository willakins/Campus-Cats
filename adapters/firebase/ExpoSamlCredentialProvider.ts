import 'react-native-get-random-values';
import { v4 as uuid } from 'uuid';
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
      throw new Error(
        'Georgia Tech SSO requires the Firebase Web App configuration.',
      );
    }
    const redirectUrl = Linking.createURL('/saml-sign-in');
    const state = uuid();
    const backendUrl = `https://${authDomain}/firebase-wrapper-app.html`;
    const result = await WebBrowser.openAuthSessionAsync(
      `${backendUrl}?linkingUri=${encodeURIComponent(redirectUrl)}&apiKey=${encodeURIComponent(apiKey)}&authDomain=${encodeURIComponent(authDomain)}&state=${encodeURIComponent(state)}`,
      redirectUrl,
      {
        dismissButtonStyle: 'cancel',
        enableDefaultShareMenuItem: false,
      },
    );
    if (result.type !== 'success' || !result.url) return undefined;
    const callback = new URL(result.url);
    const expected = new URL(redirectUrl);
    const parameters = new URLSearchParams(callback.hash.slice(1));
    if (
      callback.protocol !== expected.protocol ||
      callback.host !== expected.host ||
      callback.pathname !== expected.pathname ||
      callback.search ||
      parameters.get('state') !== state
    ) {
      throw new Error('SAML callback does not match this sign-in attempt');
    }
    const credential = parameters.get('credential');
    if (typeof credential !== 'string') {
      throw new Error('SAML redirect did not include a credential');
    }
    return SAMLAuthProvider.credentialFromJSON(JSON.parse(credential));
  }
}
