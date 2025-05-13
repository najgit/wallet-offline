const bip39 = require('bip39');
const ed25519 = require('ed25519-hd-key');
const solanaWeb3 = require('@solana/web3.js');
const bs58 = require('bs58').default; // <-- Important fix

// Generate mnemonic
const mnemonic = bip39.generateMnemonic();
console.log('Mnemonic:', mnemonic);

// Convert mnemonic to seed
const seed = bip39.mnemonicToSeedSync(mnemonic);

// Solana derivation path
const derivationPath = "m/44'/501'/0'/0'";
const derived = ed25519.derivePath(derivationPath, seed.toString('hex'));

// Generate Solana Keypair
const keypair = solanaWeb3.Keypair.fromSeed(derived.key);

// Output
console.log('\n[Solana Wallet]');
console.log('Address:     ', keypair.publicKey.toBase58());
console.log('Private Key: ', bs58.encode(Buffer.from(keypair.secretKey)));

