const bitcore = require('bitcore-lib');
const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');

// Wrap tiny-secp256k1 to make it compatible with bip32
const bip32 = BIP32Factory(ecc);

// Step 1: Generate a BIP39 mnemonic phrase
const mnemonic = bip39.generateMnemonic();
console.log('Mnemonic:', mnemonic);

// Step 2: Convert mnemonic to seed
const seed = bip39.mnemonicToSeedSync(mnemonic);

// Step 3: Create an HD wallet from the seed (BIP32)
const root = bip32.fromSeed(seed);

// Step 4: Derive the first address from the HD wallet (m/0'/0'/0')
const path = "m/44'/0'/0'/0/0"; // Using BIP44 path for Bitcoin
const child = root.derivePath(path);

// Step 5: Convert the private key to a bitcore-lib PrivateKey
const privateKey = new bitcore.PrivateKey(child.privateKey);

// Step 6: Get the corresponding Bitcoin address
const address = privateKey.toAddress();

// Step 7: Output the result
console.log('Bitcoin Address:', address.toString());
console.log('Private Key (WIF):', privateKey.toWIF());

