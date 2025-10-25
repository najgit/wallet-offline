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

	// js.Global().Set("recoverFromAES", js.FuncOf(jsRecoverFromAES))

	// hex := "2fa045d02ae3651af96b4256d0e423076b39f9ad6475ed2a45c89c18867cb898e632de1fc88ba338e80510bef2fa9d9cc7136985993adfd7caa5acdf65205870880107fcc4629887161958261c397c640e9ddeb37d1b8e0645b3c7c774056fdb5c666a4a049df7df900cb46e4e3321074284fd9db70ac1895a3df760aeeaa866ddb1b4d435da30e792cfcabaf71ea4920dcd7d6bd97b594febc4023d0028bc4418d9909b0b4a4bf9880969b4b729ddb30055d508254954d183026faf39bc"
	// pass := "123456"

	// // Create js.Value slice for arguments
	// args := []js.Value{
	// 	js.ValueOf(pass),
	// 	js.ValueOf(hex),
	// }
	// jsFunc := js.Global().Get("jsRecoverFromAES")

	// anyArgs := make([]any, len(args))
	// for i, v := range args {
	// 	anyArgs[i] = v
	// }

	// result := jsFunc.Invoke(anyArgs...)
	// fmt.Print(result)

	c := make(chan struct{})

	js.Global().Set("generateShares", js.FuncOf(panicSafe(jsGenerateShares)))
	js.Global().Set("recoverShares", js.FuncOf(panicSafe(jsRecoverShares)))
	js.Global().Set("generateQRCode", js.FuncOf(panicSafe(jsGenerateQRCode)))
	js.Global().Set("decodeQrFromImage", js.FuncOf(panicSafe(decodeQrFromImage)))
	js.Global().Set("reEncryptShares", js.FuncOf(panicSafe(jsReEncryptShares)))
	js.Global().Set("recoverFromAEStoString", js.FuncOf(panicSafe(jsRecoverFromAEStoString)))
	js.Global().Set("recoverFromAEStoHex", js.FuncOf(panicSafe(jsRecoverFromAEStoHex)))

	<-c // keep running
}

// panicSafe wraps a js.FuncOf callback to catch panics
func panicSafe(f func(js.Value, []js.Value) interface{}) func(js.Value, []js.Value) interface{} {
	return func(this js.Value, args []js.Value) (result interface{}) {
		defer func() {
			if r := recover(); r != nil {
				fmt.Println("Recovered panic:", r)
				// Return a JS error object if desired
				result = js.Global().Get("Error").New(fmt.Sprintf("%v", r))
			}
		}()
		return f(this, args)
	}
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
		enc_mnemonic, errenc = encrypt(pass, []byte(mnemonic))

		if errenc != nil {
			return map[string]any{"error": errenc.Error()}
		}

		enc_masterKeyHex, errenc = encrypt(pass, masterSecret)

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

	var enc_masterKeyHex string

	if passphrase != "" {
		enc_masterKeyHex, err = encrypt(pass, masterSecret)
		if err != nil {
			return map[string]any{"error": err.Error()}
		}
	}

	sharesJSON, _ := json.Marshal(groups)
	return map[string]any{
		// "mnemonic":     mnemonic,
		"masterKeyHex":    hex.EncodeToString(masterSecret),
		"encMasterKeyHex": enc_masterKeyHex,
		"shares":          string(sharesJSON),
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
// encryption Function
// ===============================
// encrypts plaintext with AES-256-GCM derived from password using Argon2id.
// Returns hex string encoding [salt || nonce || ciphertext].
func encrypt(password []byte, plaintext []byte) (string, error) {
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
// decryption Function
// ===============================
// decrypts hex-encoded [salt || nonce || ciphertext] using Argon2id-derived key.
func decrypt(password []byte, hexCipher string) ([]byte, error) {
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

func jsRecoverFromAEStoString(this js.Value, args []js.Value) any {
	if len(args) < 3 {
		return map[string]any{"error": "expected passphrase, re-encrypt passphrase (if exist) and 24 words Mnemonic"}
	}

	passphrase := strings.TrimSpace(args[0].String())
	mnemonic_words := args[1].String()

	// password for re_encrypt if provide
	re_passphrase := ""
	if len(args) > 2 {
		re_passphrase = args[2].String()
	}

	var pass []byte
	if passphrase != "" {
		pass = []byte(passphrase)
	} else {
		pass = nil
	}

	var passre []byte
	if re_passphrase != "" {
		passre = []byte(re_passphrase)
	} else {
		passre = nil
	}

	var mnemonic = strings.TrimSpace(mnemonic_words)
	var err error

	// decrypt 24 passphrase first
	if passphrase != "" {
		mnemonic_bytes, err := decrypt(pass, strings.TrimSpace(mnemonic_words))
		if err != nil {
			return map[string]any{"error": err.Error()}
		}
		mnemonic = string(mnemonic_bytes)
	}

	seed := bip39.NewSeed(mnemonic, "")
	masterKey, _ := bip32.NewMasterKey(seed)
	masterSecret := masterKey.Key

	groups, err := slip39.GenerateMnemonicsWithPassphrase(
		1,
		[]slip39.MemberGroupParameters{{MemberThreshold: 3, MemberCount: 5}},
		masterSecret,
		nil, // create original no decrypt share
	)

	if err != nil {
		return map[string]any{"error": err.Error()}
	}

	var re_encrypt_groups slip39.ShareGroups
	// gen encrypted share
	if re_passphrase != "" {

		groups_re, err := slip39.GenerateMnemonicsWithPassphrase(
			1,
			[]slip39.MemberGroupParameters{{MemberThreshold: 3, MemberCount: 5}},
			masterSecret,
			passre, // create original no decrypt share
		)

		if err != nil {
			return map[string]any{"error": err.Error()}
		}
		re_encrypt_groups = groups_re
	}

	var enc_masterKeyHex string
	var enc_mnemonic string
	var errenc error

	masterkeyHex := hex.EncodeToString(masterSecret)
	if re_passphrase != "" {
		enc_mnemonic, errenc = encrypt(passre, []byte(mnemonic))

		if errenc != nil {
			return map[string]any{"error": errenc.Error()}
		}

		enc_masterKeyHex, errenc = encrypt(passre, masterSecret)

		if errenc != nil {
			return map[string]any{"error": errenc.Error()}
		}
	}

	sharesJSON, _ := json.Marshal(groups)
	sharesJSONEncrypt, _ := json.Marshal(re_encrypt_groups)
	return map[string]any{
		"decrypted":       mnemonic,
		"encMnemonic":     enc_mnemonic,
		"masterKeyHex":    masterkeyHex,
		"encMasterKeyHex": enc_masterKeyHex,
		"shares":          string(sharesJSON),
		"encShares":       string(sharesJSONEncrypt),
	}
}

func jsRecoverFromAEStoHex(this js.Value, args []js.Value) any {
	if len(args) < 3 {
		return map[string]any{"error": "expected passphrase, re-encrypt passphrase (if exist) and 24 words Mnemonic"}
	}

	passphrase := strings.TrimSpace(args[0].String())
	masterSecretHex := args[1].String()

	// password for re_encrypt if provide
	re_passphrase := ""
	if len(args) > 2 {
		re_passphrase = strings.TrimSpace(args[2].String())
	}

	var pass []byte
	if passphrase != "" {
		pass = []byte(passphrase)
	} else {
		pass = nil
	}

	var passre []byte
	if re_passphrase != "" {
		passre = []byte(re_passphrase)
	} else {
		passre = nil
	}

	// var masterSecretHex = strings.TrimSpace(masterSecret)
	var err error
	var masterSecret []byte

	// decrypt 24 passphrase first
	if passphrase != "" {
		masterSecret, err = decrypt(pass, strings.TrimSpace(masterSecretHex))
		if err != nil {
			return map[string]any{"error": err.Error()}
		}
	} else {
		masterSecret, err = hex.DecodeString(strings.TrimSpace(masterSecretHex))
		if err != nil {
			return map[string]any{"error": err.Error()}
		}
	}

	groups, err := slip39.GenerateMnemonicsWithPassphrase(
		1,
		[]slip39.MemberGroupParameters{{MemberThreshold: 3, MemberCount: 5}},
		masterSecret,
		nil, // create original no decrypt share
	)

	if err != nil {
		return map[string]any{"error": err.Error()}
	}

	var re_encrypt_groups slip39.ShareGroups
	// gen encrypted share
	if re_passphrase != "" {

		groups_re, err := slip39.GenerateMnemonicsWithPassphrase(
			1,
			[]slip39.MemberGroupParameters{{MemberThreshold: 3, MemberCount: 5}},
			masterSecret,
			passre, // create original no decrypt share
		)

		if err != nil {
			return map[string]any{"error": err.Error()}
		}
		re_encrypt_groups = groups_re
	}

	var enc_masterKeyHex string
	var errenc error

	masterkeyHex := hex.EncodeToString(masterSecret)
	if re_passphrase != "" {
		enc_masterKeyHex, errenc = encrypt(passre, masterSecret)

		if errenc != nil {
			return map[string]any{"error": errenc.Error()}
		}
	}

	sharesJSON, _ := json.Marshal(groups)
	sharesJSONEncrypt, _ := json.Marshal(re_encrypt_groups)
	return map[string]any{
		"original":        masterSecretHex,
		"decrypted":       masterkeyHex,
		"encMasterKeyHex": enc_masterKeyHex,
		"shares":          string(sharesJSON),
		"encShares":       string(sharesJSONEncrypt),
	}
	// return map[string]any{"decrypted": hex.EncodeToString(result)}
}
