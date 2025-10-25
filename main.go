//go:build js && wasm

package main

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"image/jpeg"
	"io"
	"log"
	"strings"
	"syscall/js"

	"github.com/gavincarr/go-slip39"
	"github.com/makiuchi-d/gozxing"
	"github.com/makiuchi-d/gozxing/qrcode"
	skip2qrcode "github.com/skip2/go-qrcode"
	"github.com/tyler-smith/go-bip32"
	"github.com/tyler-smith/go-bip39"
	"golang.org/x/crypto/argon2"
)

type ShareGroup [][]string

func main() {
	c := make(chan struct{})

	js.Global().Set("generateShares", js.FuncOf(jsGenerateShares))
	js.Global().Set("recoverShares", js.FuncOf(jsRecoverShares))
	js.Global().Set("generateQRCode", js.FuncOf(jsGenerateQRCode))
	js.Global().Set("decodeQrFromImage", js.FuncOf(decodeQrFromImage))
	js.Global().Set("reEncryptShares", js.FuncOf(jsReEncryptShares))

	<-c // keep running
}

func jsGenerateQRCode(this js.Value, args []js.Value) any {
	data := args[0].String()
	if data == "" {
		return map[string]any{"error": "no data provided"}
	}

	png, err := skip2qrcode.Encode(data, skip2qrcode.Medium, 256)
	if err != nil {
		log.Println("QR encode error:", err)
		return map[string]any{"error": err.Error()}
	}

	// Convert PNG to base64
	b64 := base64.StdEncoding.EncodeToString(png)
	// Create data URI for embedding
	dataURI := "data:image/png;base64," + b64

	return map[string]any{
		"qrCodeDataURI": dataURI,
	}
}

func jsGenerateShares(this js.Value, args []js.Value) any {
	passphrase := strings.TrimSpace(args[0].String())

	var pass []byte
	if passphrase != "" {
		pass = []byte(passphrase)
	}

	// Generate BIP39 seed -> BIP32 master key
	entropy, _ := bip39.NewEntropy(256)
	mnemonic, _ := bip39.NewMnemonic(entropy)
	seed := bip39.NewSeed(mnemonic, "")
	masterKey, _ := bip32.NewMasterKey(seed)
	masterSecret := masterKey.Key

	groups, err := slip39.GenerateMnemonicsWithPassphrase(
		1,
		[]slip39.MemberGroupParameters{{MemberThreshold: 3, MemberCount: 5}},
		masterSecret,
		pass,
	)
	if err != nil {
		return map[string]any{"error": err.Error()}
	}

	var enc_masterKeyHex string
	var enc_mnemonic string
	var errenc error

	masterkeyHex := hex.EncodeToString(masterSecret)
	if passphrase != "" {
		enc_mnemonic, errenc = Encrypt(pass, []byte(mnemonic))

		if errenc != nil {
			return map[string]any{"error": errenc.Error()}
		}

		enc_masterKeyHex, errenc = Encrypt(pass, masterSecret)

		if errenc != nil {
			return map[string]any{"error": errenc.Error()}
		}
	}

	sharesJSON, _ := json.Marshal(groups)
	return map[string]any{
		"mnemonic":        mnemonic,
		"encMnemonic":     enc_mnemonic,
		"masterKeyHex":    masterkeyHex,
		"encMasterKeyHex": enc_masterKeyHex,
		"shares":          string(sharesJSON),
	}
}

func jsRecoverShares(this js.Value, args []js.Value) any {
	passphrase := strings.TrimSpace(args[0].String())
	sharesStr := args[1].String()

	var pass []byte
	if passphrase != "" {
		pass = []byte(passphrase)
	}

	var groups [][]string
	if err := json.Unmarshal([]byte(sharesStr), &groups); err != nil {
		return map[string]any{"error": err.Error()}
	}

	subset := groups[0] // or first 3 shares passed
	recovered, err := slip39.CombineMnemonicsWithPassphrase(subset, pass)
	if err != nil {
		return map[string]any{"error": err.Error()}
	}

	// Regenerate new shares with empty passphrase
	groupsNew, err := slip39.GenerateMnemonicsWithPassphrase(
		1,
		[]slip39.MemberGroupParameters{{MemberThreshold: 3, MemberCount: 5}},
		recovered,
		nil, // empty passphrase
	)
	if err != nil {
		return map[string]any{"error": err.Error()}
	}

	newSharesJSON, _ := json.Marshal(groupsNew)

	return map[string]any{
		"recoveredHex": hex.EncodeToString(recovered),
		"newShares":    string(newSharesJSON),
		// optionally add mnemonic or masterKeyHex if you want
	}
}

func jsReEncryptShares(this js.Value, args []js.Value) any {
	passphrase := strings.TrimSpace(args[0].String())
	privatekeyHex := args[1].String()

	var pass []byte
	if passphrase != "" {
		pass = []byte(passphrase)
	}

	masterSecret, err := hex.DecodeString(privatekeyHex)
	if err != nil {
		return map[string]any{"error": err.Error()}
	}

	groups, err := slip39.GenerateMnemonicsWithPassphrase(
		1,
		[]slip39.MemberGroupParameters{{MemberThreshold: 3, MemberCount: 5}},
		masterSecret,
		pass,
	)
	if err != nil {
		return map[string]any{"error": err.Error()}
	}

	sharesJSON, _ := json.Marshal(groups)
	return map[string]any{
		// "mnemonic":     mnemonic,
		"masterKeyHex": hex.EncodeToString(masterSecret),
		"shares":       string(sharesJSON),
	}

}

func decodeQrFromImage(this js.Value, args []js.Value) interface{} {
	// args[0]: Uint8Array containing JPEG image bytes

	uint8Array := args[0]
	length := uint8Array.Get("length").Int()
	buf := make([]byte, length)
	js.CopyBytesToGo(buf, uint8Array)

	// Decode JPEG image
	img, err := jpeg.Decode(bytes.NewReader(buf))
	if err != nil {
		return map[string]interface{}{"error": "failed to decode jpeg image: " + err.Error()}
	}

	// Create gozxing binary bitmap from image
	bmp, err := gozxing.NewBinaryBitmapFromImage(img)
	if err != nil {
		return map[string]interface{}{"error": "failed to create binary bitmap: " + err.Error()}
	}

	// Decode QR code with TRY_HARDER hint enabled
	reader := qrcode.NewQRCodeReader()
	hints := map[gozxing.DecodeHintType]interface{}{
		gozxing.DecodeHintType_TRY_HARDER: true,
	}
	result, err := reader.Decode(bmp, hints)
	if err != nil {
		return map[string]interface{}{"error": "failed to decode QR code: " + err.Error()}
	}

	// Return decoded text
	return map[string]interface{}{"text": result.GetText()}
}

// ===============================
// Key Derivation (Argon2id)
// ===============================
func DeriveKeyArgon2id(password, salt []byte) []byte {
	// Tunable Argon2id parameters for security vs performance
	const (
		time    = 3         // Number of iterations
		memory  = 64 * 1024 // 64 MB memory usage
		threads = 2         // Number of threads
		keyLen  = 32        // 32 bytes = 256 bits
	)

	return argon2.IDKey(password, salt, time, memory, uint8(threads), uint32(keyLen))
}

// ===============================
// Encryption Function
// ===============================
// Encrypts plaintext with AES-256-GCM derived from password using Argon2id.
// Returns hex string encoding [salt || nonce || ciphertext].
func Encrypt(password []byte, plaintext []byte) (string, error) {
	// Generate random 16-byte salt
	salt := make([]byte, 16)
	if _, err := io.ReadFull(rand.Reader, salt); err != nil {
		return "", fmt.Errorf("failed to generate salt: %w", err)
	}

	// Derive key using Argon2id
	key := DeriveKeyArgon2id(password, salt)

	// Create AES cipher
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("cipher init error: %w", err)
	}

	// Create GCM
	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("GCM init error: %w", err)
	}

	// Generate random nonce (12 bytes recommended for GCM)
	nonce := make([]byte, aesgcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Encrypt
	ciphertext := aesgcm.Seal(nil, nonce, plaintext, nil)

	// Combine [salt || nonce || ciphertext]
	output := append(salt, nonce...)
	output = append(output, ciphertext...)

	return hex.EncodeToString(output), nil
}

// ===============================
// Decryption Function
// ===============================
// Decrypts hex-encoded [salt || nonce || ciphertext] using Argon2id-derived key.
func Decrypt(password []byte, hexCipher string) ([]byte, error) {
	data, err := hex.DecodeString(hexCipher)
	if err != nil {
		return nil, fmt.Errorf("invalid hex input: %w", err)
	}

	if len(data) < 16+12 {
		return nil, errors.New("input too short")
	}

	salt := data[:16]
	nonce := data[16:28]
	ciphertext := data[28:]

	key := DeriveKeyArgon2id(password, salt)

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("cipher init error: %w", err)
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("GCM init error: %w", err)
	}

	plaintext, err := aesgcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("decryption failed: %w", err)
	}

	return plaintext, nil
}
