const bip39 = require('bip39');
const { Wallet, Mnemonic } = require('ethers');

const mnemonic = bip39.generateMnemonic();
console.log('Mnemonic:', mnemonic);

// Derive the Ethereum wallet from mnemonic
const ethWallet = Wallet.fromPhrase(mnemonic); // this uses the default BIP44 path: m/44'/60'/0'/0/0

console.log('\n[ETH Wallet]');
console.log('Address:     ', ethWallet.address);
console.log('Private Key: ', ethWallet.privateKey);

