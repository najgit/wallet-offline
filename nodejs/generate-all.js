const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const bitcore = require('bitcore-lib');
const ripple = require('ripple-keypairs');
const StellarSdk = require('stellar-sdk');
const { MnemonicKey } = require('@terra-money/terra.js');
const { Wallet, HDNodeWallet } = require('ethers');

//sol
const ed25519 = require('ed25519-hd-key');
const solanaWeb3 = require('@solana/web3.js');
const bs58 = require('bs58').default; // <-- Important fix


// Wrap bip32 with tiny-secp256k1
const bip32 = BIP32Factory(ecc);

// Define BIP44 derivation paths
const derivationPaths = {
  BTC: "m/44'/0'/0'/0/0",
  ETH: "m/44'/60'/0'/0/0",
  XLM: "m/44'/148'/0'/0/0",
  LUNC: "m/44'/330'/0'/0/0", // Standard for Terra (Chain ID: 330)
  SOL:  "m/44'/501'/0'/0'"
};

// 1. Generate BIP39 mnemonic
//const mnemonic = bip39.generateMnemonic();
const mnemonic = "angle genuine door tilt hollow wrestle kidney crouch because brief pepper palm"
console.log('[Mnemonic]');
console.log(mnemonic);

// 2. Convert mnemonic to seed
const seed = bip39.mnemonicToSeedSync(mnemonic);
const root = bip32.fromSeed(seed);

// --- SOLANA --- 
// // Solana derivation path
const derived = ed25519.derivePath(derivationPaths.SOL, seed.toString('hex'));
// Generate Solana Keypair
const keypair = solanaWeb3.Keypair.fromSeed(derived.key);

// Output
console.log('\n[Solana Wallet]');
console.log('Address:     ', keypair.publicKey.toBase58());
console.log('Private Key: ', bs58.encode(Buffer.from(keypair.secretKey)));



// --- BTC ---
const btcChild = root.derivePath(derivationPaths.BTC);
const btcPriv = new bitcore.PrivateKey(btcChild.privateKey);
console.log('\n[BTC Wallet]');
console.log('Address:     ', btcPriv.toAddress().toString());
console.log('Private Key: ', btcPriv.toWIF());

// --- ETH (derive manually using ethers v6)
//const ethWallet = HDNodeWallet.fromMnemonic(bip39.mnemonicToEntropy(mnemonic), derivationPaths.ETH);
const ethWallet = Wallet.fromPhrase(mnemonic, derivationPaths.ETH);
console.log('\n[ETH Wallet]');
console.log('Address:     ', ethWallet.address);
console.log('Private Key: ', ethWallet.privateKey);

// --- BNB20 
const bnbWallet = Wallet.fromPhrase(mnemonic, derivationPaths.ETH);
console.log('\n[BNB20 Wallet]');
console.log('Address:     ', bnbWallet.address);
console.log('Private Key: ', bnbWallet.privateKey);

// --- XRP ---
const xrpSeed = ripple.generateSeed({ entropy: seed.slice(0, 16) });
const xrpKeypair = ripple.deriveKeypair(xrpSeed);
console.log('\n[XRP Wallet]');
console.log('Address (PubKey):', xrpKeypair.publicKey);
console.log('Private Key:     ', xrpKeypair.privateKey);

// --- XLM ---
const xlmChild = root.derivePath(derivationPaths.XLM);
const xlmKeypair = StellarSdk.Keypair.fromRawEd25519Seed(xlmChild.privateKey);
console.log('\n[XLM Wallet]');
console.log('Public Key:  ', xlmKeypair.publicKey());
console.log('Secret Seed: ', xlmKeypair.secret());

// --- LUNC (Terra)
const terraChild = root.derivePath(derivationPaths.LUNC);
const terraKey = new MnemonicKey({ mnemonic, coinType: 330 }); // coinType: 330 is default for Terra
console.log('\n[LUNC Wallet]');
console.log('Address:     ', terraKey.accAddress);
console.log('Private Key: ', terraKey.privateKey.toString('hex'));

