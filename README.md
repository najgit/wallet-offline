
GOOS=js GOARCH=wasm go build -o main.wasm

cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .

python3 -m http.server 8080


# BUILD ON windows
set GOOS=js
set GOARCH=wasm
go build -o main.wasm

# DEPLOY
```
npm i -g vercel
# account amnarjp
vercel deploy --prod
```