const bip39 = require('bip39');
const secrets = require('secrets.js-grempe');

// BIP-39 English wordlist
const bip39Wordlist = bip39.wordlists.english;

// Configuration
const threshold = 3; // Minimum shares required to reconstruct
const totalShares = 5; // Total shares to generate

// Generate 256-bit entropy for a 33-word mnemonic (256 bits = 32 bytes)
const entropy = bip39.mnemonicToEntropy(bip39.generateMnemonic(128));  // 33 words

// Generate BIP-39 mnemonic from entropy (33 words)
const mnemonic = bip39.entropyToMnemonic(entropy);
console.log("🔐 Generated Mnemonic (33 words):");
console.log(mnemonic);

// Convert the entropy into a list of words (as BIP-39 does with entropy)
const entropyWords = bip39.entropyToMnemonic(entropy).split(' ');

// Split the entropy into shares (use the entropy as a hex string)
const shares = secrets.share(entropy.toString('hex'), totalShares, threshold);
console.log("\n📄 Shamir Shares (words):");
shares.forEach((share, index) => {
  // Convert each share from hex to words
  const shareWords = hexToWords(share);
  console.log(`Share ${index + 1}: ${shareWords.join(' ')}`);
});

// Simulate the recovery process using the shares (using 2 out of 3 shares)
const recoveredSecret = secrets.combine(shares.slice(0, threshold));

// Convert recovered entropy back to words (for display)
const recoveredWords = hexToWords(recoveredSecret);
console.log("\n♻️ Recovered Secret from 2 shares:");
console.log(recoveredWords.join(' '));

// Helper function to convert hex string to BIP-39 words
function hexToWords(hexString) {
  const wordArray = [];
  for (let i = 0; i < hexString.length; i += 2) {
    const byte = hexString.slice(i, i + 2);
    const byteValue = parseInt(byte, 16);
    wordArray.push(bip39Wordlist[byteValue % bip39Wordlist.length]);  // Map byte value to word
  }
  return wordArray;
}

