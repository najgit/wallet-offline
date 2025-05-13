package main

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/awnumar/memguard"
	"github.com/gavincarr/go-slip39"
	"github.com/skip2/go-qrcode"
	"github.com/tyler-smith/go-bip32"
	"github.com/tyler-smith/go-bip39"
)

const (
	empty = ""
	tab   = "\t"
)

func PrettyJson(data interface{}) (string, error) {
	buffer := new(bytes.Buffer)
	encoder := json.NewEncoder(buffer)
	encoder.SetIndent(empty, tab)

	err := encoder.Encode(data)
	if err != nil {
		return empty, err
	}
	return buffer.String(), nil
}

func genQrCdoe(data string) {
	qr, err := qrcode.New(data, qrcode.Medium)
	if err != nil {
		log.Panic(err)
	}

	// Print QR code to console
	fmt.Println(qr.ToSmallString(false)) // false = black on white (clearer)
}

func main() {
	passphrase := os.Args[1]
	// masterSecret := "cb54aac4b89dc868ba37d9cc21b2cec4cb54aac4b89dc868ba37d9cc21b2cec4"
	// passphrase := "TREZOR"

	// entropy, _ := bip39.NewEntropy(128)
	// mnemonic, _ := bip39.NewMnemonic(entropy)
	mnemonic := "attack zoo oxygen confirm insect eagle they embark economy october enough frequent"
	fmt.Println("🔤 Mnemonic:", mnemonic)

	// Step 2: Convert mnemonic to seed
	seed := bip39.NewSeed(mnemonic, "")

	masterKey, err := bip32.NewMasterKey(seed)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("bip32Master: ", len(masterKey.Key), hex.EncodeToString(masterKey.Key))

	// Define the group parameters: 1 group with 1 share, and 1 group with 1 share
	// groupCount := 2
	// memberGroupParams := []slip39.MemberGroupParameters{
	// 	{1, 1}, // Group 1: 1 share, threshold 1
	// 	{1, 1}, // Group 2: 1 share, threshold 1
	// }

	// Generate a single group of 3 of 5 shares for masterSecret
	// masterSecretBytes, _ := hex.DecodeString(masterSecret)
	masterSecretBytes := masterKey.Key
	fmt.Println(len(masterSecretBytes))
	groupCount := 1
	memberGroupParams := []slip39.MemberGroupParameters{{3, 5}}
	groups, _ := slip39.GenerateMnemonicsWithPassphrase(
		groupCount,
		memberGroupParams,
		masterSecretBytes,
		[]byte(passphrase),
		// nil,
	)
	groupjn, _ := PrettyJson(groups)
	fmt.Println("Store Encrypted:", string(groupjn))
	genQrCdoe(groups[0][0])
	genQrCdoe(groups[0][1])
	genQrCdoe(groups[0][2])
	genQrCdoe(groups[0][3])
	genQrCdoe(groups[0][4])
	// Output: 5

	// Combine 3 of the 5 shares to recover the master secret
	shares := []string{groups[0][0], groups[0][2], groups[0][4]}
	recoveredSecret, _ := slip39.CombineMnemonicsWithPassphrase(
		shares,
		[]byte(passphrase),
		// nil,
	)

	///////////
	groups_original, _ := slip39.GenerateMnemonicsWithPassphrase(
		groupCount,
		memberGroupParams,
		masterSecretBytes,
		// []byte(passphrase),
		nil,
	)
	groupjn_original, _ := PrettyJson(groups_original)
	fmt.Println("Store Original:", string(groupjn_original))
	// Output: 5

	// Combine 3 of the 5 shares to recover the master secret
	shares_original := []string{groups_original[0][0], groups_original[0][2], groups_original[0][1]}
	recoveredSecret_original, _ := slip39.CombineMnemonicsWithPassphrase(
		shares_original,
		// []byte(passphrase),
		nil,
	)

	fmt.Println("encrypted ", hex.EncodeToString(recoveredSecret))
	fmt.Println("original ", hex.EncodeToString(recoveredSecret_original))
	// Output: bb54aac4b89dc868ba37d9cc21b2cece

	// xrp()

	protectPasswordMemory("SecurePasswordINMemory")
}

func protectPasswordMemory(pass string) {
	// Ensure memguard exits cleanly on interruption
	memguard.CatchInterrupt()

	// Purge leaked secrets on exit
	defer memguard.Purge()

	// Securely allocate a password in memory
	password := memguard.NewBufferFromBytes([]byte(pass))

	// Use the password securely (example: print length)
	fmt.Printf("Password is %d characters long\n", password.Size())
	fmt.Printf("Password is %s \n", string(password.Data()))

	// Zero out memory and destroy the buffer when done
	password.Destroy()
}

// func xrp() {
// 	// Step 1: Generate a 12-word mnemonic
// 	entropy, _ := bip39.NewEntropy(128)
// 	mnemonic, _ := bip39.NewMnemonic(entropy)
// 	fmt.Println("🔤 Mnemonic:", mnemonic)

// 	// Step 2: Convert mnemonic to seed
// 	seed := bip39.NewSeed(mnemonic, "")

// 	// Step 3: Derive master key from seed
// 	masterKey, err := bip32.NewMasterKey(seed)
// 	if err != nil {
// 		log.Fatal(err)
// 	}
// 	fmt.Println("bip32Master: ", len(masterKey.Key))
// 	// Step 4: Derive child key for path m/44'/144'/0'/0/0
// 	purpose, _ := masterKey.NewChildKey(bip32.FirstHardenedChild + 44)
// 	coinType, _ := purpose.NewChildKey(bip32.FirstHardenedChild + 144)
// 	account, _ := coinType.NewChildKey(bip32.FirstHardenedChild + 0)
// 	change, _ := account.NewChildKey(0)
// 	addressKey, _ := change.NewChildKey(0)

// 	// Step 5: Extract private key and public key
// 	privateKey, publicKey := btcec.PrivKeyFromBytes(btcec.S256(), addressKey.Key)
// 	pubCompressed := publicKey.SerializeCompressed()

// 	fmt.Println("🔐 Private Key (hex):", hex.EncodeToString(privateKey.Serialize()))
// 	fmt.Println("🔑 Public Key (compressed):", hex.EncodeToString(pubCompressed))

// 	// Step 6: Generate XRP classic address
// 	pubSHA := sha256.Sum256(pubCompressed)
// 	ripemd := ripemd160.New()
// 	ripemd.Write(pubSHA[:])
// 	pubRIPEMD := ripemd.Sum(nil)

// 	// Add 0x00 version byte
// 	versioned := append([]byte{0x00}, pubRIPEMD...)

// 	// Double SHA256 for checksum
// 	hash1 := sha256.Sum256(versioned)
// 	hash2 := sha256.Sum256(hash1[:])
// 	checksum := hash2[:4]

// 	// Final payload and base58 encode
// 	finalPayload := append(versioned, checksum...)
// 	address := base58.Encode(finalPayload)

// 	fmt.Println("🏦 XRP Address:", address)
// }
