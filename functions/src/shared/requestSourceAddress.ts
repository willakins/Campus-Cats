import { isIP } from 'node:net';

interface RequestAddress {
  get(name: string): string | undefined;
  socket: { remoteAddress?: string };
}

export function requestSourceAddress(
  request: RequestAddress,
): string | undefined {
  // Google appends the observed source/proxy to X-Forwarded-For. The framework
  // trusts the whole chain for req.ip, including a client-supplied prefix.
  // Use the final hop. An extra upstream proxy shares a quota, conservatively.
  // Local/emulator requests have no trusted Google proxy.
  const forwarded =
    process.env.FUNCTIONS_EMULATOR === 'true'
      ? undefined
      : request.get('x-forwarded-for')?.split(',').pop()?.trim();
  if (forwarded && isIP(forwarded)) return forwarded;
  return request.socket.remoteAddress;
}
