const bip39 = require('bip39');
const ed25519 = require('ed25519-hd-key');
const baseX = require('base-x');
const bs58 = require('bs58').default;
const crypto = require('crypto');

// Base58 alphabet
//const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
//const base58 = baseX(BASE58_ALPHABET);

// Generate a 12-word BIP39 mnemonic
const mnemonic = bip39.generateMnemonic();
console.log('Mnemonic:', mnemonic);

// Convert mnemonic to seed
const seed = bip39.mnemonicToSeedSync(mnemonic);

// Use the Cardano BIP44 derivation path (m/44'/1815'/0'/0') for Cardano (ADA)
const derivationPath = "m/44'/1815'/0'/0'";

// Derive the key using ed25519-hd-key
const derived = ed25519.derivePath(derivationPath, seed.toString('hex'));

const privateKey = derived.key;

(async () => {
  //await sodium.ready; // Ensure libsodium is loaded

//const keypair = createKeyPairFromSeed(privateKey);  // Ed25519 keypair from private key
//const publicKey = publicKeyCreate(privateKey); // Extract public key

const publicKeyObject = crypto.createPublicKey({
  key: privateKey,
  format: 'der',
  type: 'pkcs1' // or 'pkcs8' depending on your private key format
});

	const publicKey = publicKeyObject.export({ format: 'pem', type: 'spki' });

//const publicKey = sodium.crypto_box_publickey_from_secretkey(privateKey);  // Public key from private key

// Ensure the public key is a Uint8Array before encoding it
const publicKeyUint8Array = new Uint8Array(publicKey);

// Encode the public key to Base58 (simplified Cardano address)
const cardanoAddress = bs58.encode(publicKeyUint8Array);

console.log('\n[Cardano Wallet]');
console.log('Address (Base58):     ', cardanoAddress);
console.log('Private Key (Hex):    ', privateKey.toString('hex'));  // Keep this secure!
})();
