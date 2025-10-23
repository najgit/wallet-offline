//go:build js && wasm

package main

import (
	"encoding/hex"
	"encoding/json"
	"strings"
	"syscall/js"

	"github.com/gavincarr/go-slip39"
	"github.com/tyler-smith/go-bip32"
	"github.com/tyler-smith/go-bip39"
)

func main() {
	c := make(chan struct{})

	js.Global().Set("generateShares", js.FuncOf(jsGenerateShares))
	js.Global().Set("recoverShares", js.FuncOf(jsRecoverShares))

	<-c // keep running
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

	subset := []string{groups[0][0], groups[0][1], groups[0][2]}
	recovered, err := slip39.CombineMnemonicsWithPassphrase(subset, []byte(passphrase))
	if err != nil {
		return map[string]any{"error": err.Error()}
	}

	return map[string]any{"recoveredHex": hex.EncodeToString(recovered)}
}
