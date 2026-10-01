declare module 'firebase-tools/lib/auth' {
  interface FirebaseCliTokens {
    readonly access_token?: string;
    readonly expires_at?: number;
    readonly expires_in?: number;
    readonly refresh_token?: string;
  }

  interface FirebaseCliAccount {
    readonly tokens: FirebaseCliTokens;
  }

  export function getGlobalDefaultAccount(): FirebaseCliAccount | undefined;
}

declare module 'firebase-tools/lib/api' {
  export function clientId(): string;
  export function clientSecret(): string;
}
