const go = new Go();
WebAssembly.instantiateStreaming(fetch("main.wasm"), go.importObject).then(result => {
  go.run(result.instance);
  console.log("WASM loaded");
});

document.getElementById("genBtn").onclick = async () => {
  const pass = document.getElementById("pass").value;
  const res = await generateShares(pass);
  document.getElementById("out").textContent = JSON.stringify(res, null, 2);
};

document.getElementById("recBtn").onclick = async () => {
  const pass = document.getElementById("pass").value;
  const shares = document.getElementById("sharesInput").value;
  const res = await recoverShares(pass, shares);
  document.getElementById("recOut").textContent = JSON.stringify(res, null, 2);
};
