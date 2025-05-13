const bip39 = require('bip39');
const { MnemonicKey } = require('@terra-money/terra.js');

// 1. Generate BIP39 mnemonic
const mnemonic = bip39.generateMnemonic(); // 12-word phrase
console.log('Mnemonic:', mnemonic);

// 2. Generate Terra Classic wallet from mnemonic
const mk = new MnemonicKey({ mnemonic });

console.log('\n[LUNC Wallet]');
console.log('Address:     ', mk.accAddress);
console.log('Private Key: ', mk.privateKey.toString('hex'));

