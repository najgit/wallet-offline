//go:build js && wasm

package main

import (
	"bytes"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"image/jpeg"
	"log"
	"strings"
	"syscall/js"

	"github.com/gavincarr/go-slip39"
	"github.com/makiuchi-d/gozxing"
	"github.com/makiuchi-d/gozxing/qrcode"
	skip2qrcode "github.com/skip2/go-qrcode"
	"github.com/tyler-smith/go-bip32"
	"github.com/tyler-smith/go-bip39"
)

func main() {
	c := make(chan struct{})

	js.Global().Set("generateShares", js.FuncOf(jsGenerateShares))
	js.Global().Set("recoverShares", js.FuncOf(jsRecoverShares))
	js.Global().Set("generateQRCode", js.FuncOf(jsGenerateQRCode))
	js.Global().Set("decodeQrFromImage", js.FuncOf(decodeQrFromImage))

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
		[]byte(passphrase),
	)
	if err != nil {
		return map[string]any{"error": err.Error()}
	}

	sharesJSON, _ := json.Marshal(groups)
	return map[string]any{
		"mnemonic":     mnemonic,
		"masterKeyHex": hex.EncodeToString(masterSecret),
		"shares":       string(sharesJSON),
	}
}

func jsRecoverShares(this js.Value, args []js.Value) any {
	passphrase := strings.TrimSpace(args[0].String())
	sharesStr := args[1].String()

	var groups [][]string
	if err := json.Unmarshal([]byte(sharesStr), &groups); err != nil {
		return map[string]any{"error": err.Error()}
	}

	subset := groups[0] // or first 3 shares passed
	recovered, err := slip39.CombineMnemonicsWithPassphrase(subset, []byte(passphrase))
	if err != nil {
		return map[string]any{"error": err.Error()}
	}

	// Regenerate new shares with empty passphrase
	groupsNew, err := slip39.GenerateMnemonicsWithPassphrase(
		1,
		[]slip39.MemberGroupParameters{{MemberThreshold: 3, MemberCount: 5}},
		recovered,
		[]byte(""), // empty passphrase
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
