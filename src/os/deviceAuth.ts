/** Local WebAuthn device confirmation. This is not Apple Face ID and does not protect against a user controlling this browser. */
const KEY = 'ios-sim-device-auth';
type CredentialRecord = { id: string; publicKey: string };
function encode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decode(text: string): Uint8Array<ArrayBuffer> {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - text.length % 4) % 4));
  return Uint8Array.from(s, c => c.charCodeAt(0));
}
function challenge(): Uint8Array<ArrayBuffer> { return crypto.getRandomValues(new Uint8Array(32)); }
export function hasDeviceAuth(): boolean { return !!localStorage.getItem(KEY); }
export function removeDeviceAuth() { localStorage.removeItem(KEY); }
export async function registerDeviceAuth(): Promise<void> {
  if (!window.isSecureContext || !window.PublicKeyCredential || !navigator.credentials || !crypto.subtle) throw new Error('Device authentication requires a supported browser and HTTPS.');
  if (!await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()) throw new Error('No compatible device authenticator is available.');
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: challenge(), rp: { name: 'iOS Simulator', id: location.hostname },
    user: { id: challenge(), name: 'simulator-user', displayName: 'Simulator User' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }], timeout: 60000, attestation: 'none',
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
  } }) as PublicKeyCredential | null;
  const response = cred?.response as AuthenticatorAttestationResponse | undefined;
  const key = response?.getPublicKey?.();
  if (!cred || !response || !key || response.getPublicKeyAlgorithm?.() !== -7) throw new Error('The authenticator did not provide a supported public key.');
  localStorage.setItem(KEY, JSON.stringify({ id: encode(cred.rawId), publicKey: encode(key) } satisfies CredentialRecord));
}
// WebAuthn signatures use ASN.1 DER; WebCrypto expects fixed-width r || s.
function rawSignature(sig: Uint8Array): Uint8Array<ArrayBuffer> {
  if (sig[0] !== 0x30 || sig[1] !== sig.length - 2 || sig[2] !== 0x02) throw new Error('Invalid signature');
  let pos = 3; const rl = sig[pos++]; const r = sig.slice(pos, pos + rl); pos += rl;
  if (sig[pos++] !== 0x02) throw new Error('Invalid signature');
  const sl = sig[pos++]; const s = sig.slice(pos, pos + sl); pos += sl;
  if (pos !== sig.length || r.length > 33 || s.length > 33) throw new Error('Invalid signature');
  const rr = r.length === 33 && r[0] === 0 ? r.slice(1) : r; const ss = s.length === 33 && s[0] === 0 ? s.slice(1) : s;
  if (rr.length > 32 || ss.length > 32) throw new Error('Invalid signature');
  const out = new Uint8Array(64); out.set(rr, 32 - rr.length); out.set(ss, 64 - ss.length); return out;
}
export async function verifyDeviceAuth(): Promise<boolean> {
  const record: CredentialRecord = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (!record || !crypto.subtle) return false;
  const nonce = challenge();
  const cred = await navigator.credentials.get({ publicKey: { challenge: nonce, rpId: location.hostname, allowCredentials: [{ type: 'public-key', id: decode(record.id) }], userVerification: 'required', timeout: 60000 } }) as PublicKeyCredential | null;
  if (!cred || encode(cred.rawId) !== record.id) return false;
  const response = cred.response as AuthenticatorAssertionResponse;
  const client = JSON.parse(new TextDecoder().decode(response.clientDataJSON));
  if (client.type !== 'webauthn.get' || client.challenge !== encode(nonce) || client.origin !== location.origin || client.crossOrigin) return false;
  const auth = new Uint8Array(response.authenticatorData);
  const rpHash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(location.hostname)));
  if (auth.length < 37 || !(auth[32] & 1) || !(auth[32] & 4) || !rpHash.every((b, i) => b === auth[i])) return false;
  const clientHash = new Uint8Array(await crypto.subtle.digest('SHA-256', response.clientDataJSON));
  const signed = new Uint8Array(auth.length + clientHash.length); signed.set(auth); signed.set(clientHash, auth.length);
  const key = await crypto.subtle.importKey('spki', decode(record.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, rawSignature(new Uint8Array(response.signature)), signed);
}
