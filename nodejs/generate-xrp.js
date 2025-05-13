const bip39 = require('bip39');
const ripple = require('ripple-keypairs');

// 1. Generate BIP39 mnemonic (12-word phrase)
const mnemonic = bip39.generateMnemonic();
console.log('Mnemonic:', mnemonic);

// 2. Convert mnemonic to seed
const seed = bip39.mnemonicToSeedSync(mnemonic);

// 3. Generate XRP keypair from the seed
const xrpKeypair = ripple.generateSeed({ entropy: seed.slice(0, 16) });
const xrpWallet = ripple.deriveKeypair(xrpKeypair);

console.log('\n[XRP Wallet]');
console.log('Address:     ', xrpWallet.publicKey);
console.log('Private Key: ', xrpWallet.privateKey);

