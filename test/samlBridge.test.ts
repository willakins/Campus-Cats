const { runSamlBridge } = require('../public/firebase-wrapper-app.js');

const linkingUri = 'campuscats://saml-sign-in';
const search = `?linkingUri=${encodeURIComponent(linkingUri)}&apiKey=web-api-key&authDomain=campus-cats.firebaseapp.com`;

const createHarness = ({
  pending = false,
  redirectResult = { credential: null },
}: {
  pending?: boolean;
  redirectResult?: { credential: { toJSON(): object } | null };
} = {}) => {
  const auth = {
    getRedirectResult: jest.fn().mockResolvedValue(redirectResult),
    signInWithRedirect: jest.fn().mockResolvedValue(undefined),
  };
  const provider = { providerId: 'saml.gt-sso' };
  const firebase = {
    initializeApp: jest.fn(() => ({ auth: () => auth })),
    auth: { SAMLAuthProvider: jest.fn(() => provider) },
  };
  const storage = {
    getItem: jest.fn(() => (pending ? 'pending' : null)),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  };
  const location = {
    search,
    replace: jest.fn(),
    reload: jest.fn(),
  };
  const render = jest.fn();

  return { auth, firebase, location, provider, render, storage };
};

describe('Firebase SAML bridge', () => {
  it('starts a fresh SAML redirect and records recoverable session state', async () => {
    const harness = createHarness();

    await runSamlBridge(harness);

    expect(harness.storage.setItem).toHaveBeenCalledWith(
      'campus-cats:saml-redirect',
      'pending',
    );
    expect(harness.auth.signInWithRedirect).toHaveBeenCalledWith(harness.provider);
  });

  it('shows a retryable error instead of waiting forever for an empty return', async () => {
    const harness = createHarness({ pending: true });

    await runSamlBridge(harness);

    expect(harness.storage.removeItem).toHaveBeenCalledWith('campus-cats:saml-redirect');
    expect(harness.render).toHaveBeenLastCalledWith({
      state: 'error',
      message: 'Georgia Tech SSO did not return a credential. Please try again.',
      canRetry: true,
    });
  });

  it('returns a successful credential to the app', async () => {
    const credential = { toJSON: () => ({ providerId: 'saml.gt-sso', token: 'token' }) };
    const harness = createHarness({ pending: true, redirectResult: { credential } });

    await runSamlBridge(harness);

    expect(harness.location.replace).toHaveBeenCalledTimes(1);
    const callback = new URL(harness.location.replace.mock.calls[0][0]);
    expect(`${callback.protocol}//${callback.host}${callback.pathname}`).toBe(linkingUri);
    expect(JSON.parse(callback.searchParams.get('credential') ?? '{}')).toEqual(
      credential.toJSON(),
    );
  });

  it('reports incomplete web configuration without calling Firebase', async () => {
    const harness = createHarness();
    harness.location.search = `?linkingUri=${encodeURIComponent(linkingUri)}`;

    await runSamlBridge(harness);

    expect(harness.firebase.initializeApp).not.toHaveBeenCalled();
    expect(harness.render).toHaveBeenLastCalledWith({
      state: 'error',
      message: 'Georgia Tech SSO is not configured for this web app.',
      canRetry: false,
    });
  });

  it('turns provider failures into a readable retry state', async () => {
    const harness = createHarness();
    harness.auth.signInWithRedirect.mockRejectedValue(
      new Error('{"error":{"code":403,"message":"API key blocked"}}'),
    );

    await runSamlBridge(harness);

    expect(harness.render).toHaveBeenLastCalledWith({
      state: 'error',
      message:
        'Georgia Tech SSO could not start. Check the Firebase Web App configuration and try again.',
      canRetry: true,
    });
  });
});
