
GOOS=js GOARCH=wasm go build -o main.wasm

cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .

python3 -m http.server 8080
