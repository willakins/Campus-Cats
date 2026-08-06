const { Blob } = require('node:buffer');
const fetch = require('node-fetch');

// Jest Expo installs React Native's fetch implementation, while the current
// rules-test SDK uses standard server-side fetch for emulator administration.
Object.assign(globalThis, {
  fetch: async (input, init) => {
    const body = init?.body;
    if (body instanceof Blob) {
      return fetch(input, {
        ...init,
        body: Buffer.from(await body.arrayBuffer()),
      });
    }

    return fetch(input, init);
  },
  Headers: fetch.Headers,
  Request: fetch.Request,
  Response: fetch.Response,
  Blob,
});

// Emulator host/port pairs are explicit in every suite. Avoid the optional hub
// discovery request because no test needs dynamic endpoint discovery.
delete process.env.FIREBASE_EMULATOR_HUB;
