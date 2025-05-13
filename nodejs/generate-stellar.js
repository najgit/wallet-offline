const bip39 = require('bip39');
const StellarSdk = require('stellar-sdk');

// 1. Generate BIP39 mnemonic (12-word phrase)
const mnemonic = bip39.generateMnemonic();
console.log('Mnemonic:', mnemonic);

// 2. Convert mnemonic to seed
const seed = bip39.mnemonicToSeedSync(mnemonic);

// 3. Generate Stellar Keypair from the seed
const keypair = StellarSdk.Keypair.fromRawEd25519Seed(seed.slice(0, 32));

console.log('\n[XLM Wallet]');
console.log('Address:     ', keypair.publicKey());
console.log('Private Key: ', keypair.secret());

