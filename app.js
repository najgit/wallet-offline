const go = new Go();

async function loadWasm() {
  const result = await WebAssembly.instantiateStreaming(fetch('main.wasm'), go.importObject);
  go.run(result.instance);

  // Now WASM is ready, set up event listeners
  setupEventListeners();
}

function setupEventListeners() {
  document.getElementById('genBtn').addEventListener('click', () => {
    const passphrase = document.getElementById('passphrase').value || '';
    if (window.generateShares) {
        const result = window.generateShares(passphrase);
        console.log('generateShares result:', result);

        const outputEl = document.getElementById('genResult');
        try {
        const obj = typeof result === 'string' ? JSON.parse(result) : result;

        // Format shares nicely
        let formattedShares = '';
        if (obj.shares) {
            // obj.shares is a JSON string of groups [][]string
            let sharesGroups = JSON.parse(obj.shares);
            sharesGroups.forEach((group, groupIdx) => {
            formattedShares += `Group ${groupIdx + 1}:\n`;
            group.forEach((share, shareIdx) => {
                formattedShares += `  Share ${shareIdx + 1}: ${share}\n`;
            });
            formattedShares += '\n';
            });
        }

        // Show mnemonic, masterKeyHex and formatted shares
        outputEl.textContent = 
            `Mnemonic: ${obj.mnemonic}\n\n` +
            `Master Key (hex): ${obj.masterKeyHex}\n\n` +
            `Shares:\n${formattedShares}`;
        } catch (e) {
        // fallback: just show raw result
        outputEl.textContent = String(result);
        }
    } else {
        console.warn('generateShares function not found');
    }
    });

  document.getElementById('recoverBtn').addEventListener('click', () => {
    const passphrase = document.getElementById('passphrase').value || '';
    const shares = document.getElementById('shares').value || '';
    if (window.recoverShares) {
      const result = window.recoverShares(passphrase, shares);
      console.log('recoverShares result:', result);

      const outputEl = document.getElementById('recoverResult');
      try {
        const obj = typeof result === 'string' ? JSON.parse(result) : result;
        outputEl.textContent = JSON.stringify(obj, null, 2);
      } catch {
        outputEl.textContent = String(result);
      }
    } else {
      console.warn('recoverShares function not found');
    }
  });
}

loadWasm();
