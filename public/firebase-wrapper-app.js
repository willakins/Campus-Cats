(function exposeSamlBridge(root, factory) {
  const bridge = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = bridge;
  } else {
    root.CampusCatsSamlBridge = bridge;
  }
})(typeof self === 'undefined' ? globalThis : self, function createSamlBridge() {
  const stateKey = 'campus-cats:saml-redirect';
  const emptyCredentialMessage =
    'Georgia Tech SSO did not return a credential. Please try again.';

  const renderFailure = (render, message, canRetry = true) => {
    render({ state: 'error', message, canRetry });
  };

  const runSamlBridge = async ({ firebase, location, storage, render }) => {
    const parameters = new URLSearchParams(location.search);
    const linkingUri = parameters.get('linkingUri');
    const apiKey = parameters.get('apiKey');
    const authDomain = parameters.get('authDomain');

    if (!linkingUri || !apiKey || !authDomain) {
      renderFailure(
        render,
        'Georgia Tech SSO is not configured for this web app.',
        false,
      );
      return;
    }

    render({
      state: 'loading',
      message: 'Connecting to Georgia Tech SSO…',
      canRetry: false,
    });

    try {
      const app = firebase.initializeApp({ apiKey, authDomain });
      const auth = app.auth();
      const provider = new firebase.auth.SAMLAuthProvider('saml.gt-sso');

      if (storage.getItem(stateKey) === 'pending') {
        render({
          state: 'loading',
          message: 'Completing Georgia Tech sign-in…',
          canRetry: false,
        });
        const result = await auth.getRedirectResult();
        if (!result?.credential) {
          throw new Error(emptyCredentialMessage);
        }

        storage.removeItem(stateKey);
        const callback = new URL(linkingUri);
        callback.searchParams.set(
          'credential',
          JSON.stringify(result.credential.toJSON()),
        );
        location.replace(callback.toString());
        return;
      }

      storage.setItem(stateKey, 'pending');
      render({
        state: 'loading',
        message: 'Redirecting to Georgia Tech…',
        canRetry: false,
      });
      await auth.signInWithRedirect(provider);
    } catch (error) {
      storage.removeItem(stateKey);
      const message =
        error instanceof Error && error.message === emptyCredentialMessage
          ? emptyCredentialMessage
          : 'Georgia Tech SSO could not start. Check the Firebase Web App configuration and try again.';
      renderFailure(render, message);
    }
  };

  return { runSamlBridge, stateKey };
});
