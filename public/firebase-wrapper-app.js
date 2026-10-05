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
  const networkFailureMessage =
    'Georgia Tech SSO needs an internet connection. Reconnect and try again.';

  // Credentials may only return to our native route or this hosted app. Never
  // use a caller-controlled URL as an unrestricted credential redirect.
  const validCallback = (value, location) => {
    try {
      if (/[\s\\]/.test(value)) return false;
      const url = new URL(value);
      if (url.username || url.password || url.port || url.search || url.hash) return false;
      if (url.protocol === 'campuscats:') {
        return (url.hostname === 'saml-sign-in' && !url.pathname) ||
          (!url.hostname && url.pathname === '/saml-sign-in');
      }
      const hosts = [location.hostname];
      if (/^[a-z0-9-]+\.(firebaseapp\.com|web\.app)$/.test(location.hostname)) {
        hosts.push(location.hostname.replace(/\.(firebaseapp\.com|web\.app)$/, '.firebaseapp.com'));
        hosts.push(location.hostname.replace(/\.(firebaseapp\.com|web\.app)$/, '.web.app'));
      }
      return url.protocol === 'https:' && hosts.includes(url.hostname) &&
        url.pathname === '/saml-sign-in';
    } catch {
      return false;
    }
  };

  const renderFailure = (render, message, canRetry = true) => {
    render({ state: 'error', message, canRetry });
  };

  const runSamlBridge = async ({ firebase, location, storage, render }) => {
    const parameters = new URLSearchParams(location.search);
    const linkingUri = parameters.get('linkingUri');
    const apiKey = parameters.get('apiKey');
    const authDomain = parameters.get('authDomain');
    const state = parameters.get('state');

    if (!linkingUri || !apiKey || !authDomain ||
        authDomain !== location.hostname || !validCallback(linkingUri, location) ||
        !state || !/^[A-Za-z0-9_-]{16,200}$/.test(state)) {
      renderFailure(
        render,
        'Georgia Tech SSO is not configured for this web app.',
        false,
      );
      return;
    }

    if (
      !firebase ||
      typeof firebase.initializeApp !== 'function' ||
      typeof firebase.auth?.SAMLAuthProvider !== 'function'
    ) {
      renderFailure(render, networkFailureMessage);
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

      const expectedSession = JSON.stringify({ linkingUri, apiKey, authDomain, state });
      const pendingSession = storage.getItem(stateKey);
      if (pendingSession && pendingSession !== expectedSession) {
        throw new Error('SSO return does not match the pending session');
      }
      if (pendingSession === expectedSession) {
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
        // Fragments stay in the browser and are not sent to hosting/access logs.
        callback.hash = new URLSearchParams({
          state, credential: JSON.stringify(result.credential.toJSON()),
        }).toString();
        location.replace(callback.toString());
        return;
      }

      storage.setItem(stateKey, expectedSession);
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
          : error && error.code === 'auth/network-request-failed'
            ? networkFailureMessage
          : 'Georgia Tech SSO could not start. Check the Firebase Web App configuration and try again.';
      renderFailure(render, message);
    }
  };

  return { runSamlBridge, stateKey };
});
