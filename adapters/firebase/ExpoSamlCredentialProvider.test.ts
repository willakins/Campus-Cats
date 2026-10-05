import * as WebBrowser from 'expo-web-browser';
import { SAMLAuthProvider } from 'firebase/auth';
import { ExpoSamlCredentialProvider } from './ExpoSamlCredentialProvider';

jest.mock('expo-linking', () => ({
  createURL: () => 'campuscats://saml-sign-in',
}));
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  WebBrowserResultType: { CANCEL: 'cancel' },
}));
jest.mock('uuid', () => ({ v4: () => 'nonce-for-this-sign-in' }));
jest.mock('firebase/auth', () => ({
  SAMLAuthProvider: { credentialFromJSON: jest.fn((value) => value) },
}));
const provider = () =>
  new ExpoSamlCredentialProvider({
    apiKey: 'public-api-key',
    authDomain: 'campus-cats.firebaseapp.com',
  });
const callback = (state: string, route = 'campuscats://saml-sign-in') =>
  `${route}#state=${state}&credential=${encodeURIComponent(JSON.stringify({ providerId: 'saml.gt-sso' }))}`;

beforeEach(() => jest.clearAllMocks());
it('requires the callback to belong to this sign-in attempt', async () => {
  for (const url of [
    callback('wrong-state'),
    callback('nonce-for-this-sign-in', 'campuscats://other'),
  ]) {
    jest
      .mocked(WebBrowser.openAuthSessionAsync)
      .mockResolvedValue({ type: 'success', url });
    await expect(provider().credential()).rejects.toThrow();
    expect(SAMLAuthProvider.credentialFromJSON).not.toHaveBeenCalled();
  }
});
it('accepts the expected callback with the current sign-in state', async () => {
  jest
    .mocked(WebBrowser.openAuthSessionAsync)
    .mockResolvedValue({
      type: 'success',
      url: callback('nonce-for-this-sign-in'),
    });
  await expect(provider().credential()).resolves.toEqual({
    providerId: 'saml.gt-sso',
  });
  expect(
    new URL(
      jest.mocked(WebBrowser.openAuthSessionAsync).mock.calls[0][0],
    ).searchParams.get('state'),
  ).toBe('nonce-for-this-sign-in');
});
it('leaves cancelled sign-in attempts without credentials', async () => {
  jest
    .mocked(WebBrowser.openAuthSessionAsync)
    .mockResolvedValue({ type: WebBrowser.WebBrowserResultType.CANCEL });
  await expect(provider().credential()).resolves.toBeUndefined();
});
