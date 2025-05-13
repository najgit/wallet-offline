package main

import (
	"fmt"
	"log"

	"github.com/skip2/go-qrcode"
)

func main() {
	data := "usual agency academic axle ajar genre agency repair fatal mayor prevent fumes emerald view mule ordinary vexed aide chubby scholar husband expand benefit pants believe garbage envelope domain cage freshman deliver pecan patent" // or a wallet address, etc.

	// Generate QR code as ASCII
	qr, err := qrcode.New(data, qrcode.Medium)
	if err != nil {
		log.Fatal(err)
	}

	// Print QR code to console
	fmt.Println(qr.ToSmallString(false)) // false = black on white (clearer)
}
