// --- Place this code block near the start of your app.js file ---

if ('serviceWorker' in navigator) {
  // We use '/service-worker.js' to ensure the browser looks at the site root, 
  // and scope: '/' to ensure it controls the entire application.
  navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
    .then(registration => {
      console.log('Service Worker registered successfully. Scope:', registration.scope);
    })
    .catch(error => {
      // This will show if the file is missing, the path is wrong, 
      // or if there's a strict CSP issue still blocking the worker.
      console.error('Service Worker registration failed:', error);
    });
} else {
  console.log('Service Workers are not supported in this browser.');
}

// -----------------------------------------------------------------

const go = new Go();

async function loadWasm() {
    // ... existing WASM loading logic ...
    const response = await fetch('main.wasm');
    const bytes = await response.arrayBuffer();
    const result = await WebAssembly.instantiate(bytes, go.importObject);
    go.run(result.instance);

    // Now WASM is ready, set up event listeners
    setupEventListeners();
    console.log("WASM loaded");
}

async function secureClear() {
      console.log("Clearing sensitive data…");

      // 1️⃣ Clear all input fields
      document.querySelectorAll('input').forEach(input => {
        input.value = '';
        input.blur();
      });

      // 2️⃣ Clear storage
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (err) {
        console.warn("Storage clear failed:", err);
      }

      // 3️⃣ Delete all IndexedDB databases
      if ('indexedDB' in window) {
        try {
          const dbs = await indexedDB.databases();
          for (const db of dbs) {
            if (db.name) {
              console.log("Deleting DB:", db.name);
              indexedDB.deleteDatabase(db.name);
            }
          }
        } catch (err) {
          console.warn("IndexedDB clear failed:", err);
        }
      }

      // 4️⃣ (Optional) Clear in-memory WASM or JS variables
      if (window.GoWasmMemory) {
        // Example placeholder for clearing Go state if you track it
        window.GoWasmMemory = null;
      }

      // 5️⃣ Give the browser a moment, then hard reload
      setTimeout(() => {
        console.log("Reloading page securely…");
        window.location.reload(true); // true = force reload from server
      }, 150);
    }


async function displayQR(qrData, qrText, outputEl) {

 // Generate QR code image for this share
    let qrResult = null;
    if (window.generateQRCode) {
        qrResult = await window.generateQRCode(qrData);
    }

    // Container for QR + share words
    const qrBlock = document.createElement('div');
    qrBlock.style.marginBottom = '1.5em';

    // QR image
    if (qrResult && qrResult.qrCodeDataURI) {
        const img = document.createElement('img');
        img.src = qrResult.qrCodeDataURI;
        img.alt = `QR code `;
        img.style.display = 'block';
        img.style.marginBottom = '8px';
        img.style.width = '200px';  // or your preferred size
        img.style.height = '200px';
        qrBlock.appendChild(img);
    }

    outputEl.appendChild(qrBlock);

    const groupDiv = document.createElement('div');
    groupDiv.innerHTML = `<strong> ${qrText}</strong>`;
    outputEl.appendChild(groupDiv);
    // console.log(qrData)
}

async function displaySharesWithQR(sharesGroups, outputEl) {
//   const outputEl = document.getElementById('genResult');
//   outputEl.innerHTML = ''; // clear previous

  for (let groupIdx = 0; groupIdx < sharesGroups.length; groupIdx++) {
    const group = sharesGroups[groupIdx];
    const groupDiv = document.createElement('div');
    groupDiv.innerHTML = `<strong>Group ${groupIdx + 1}:</strong>`;
    outputEl.appendChild(groupDiv);

    for (let shareIdx = 0; shareIdx < group.length; shareIdx++) {
      const share = group[shareIdx];

      // Generate QR code image for this share
      let qrResult = null;
      if (window.generateQRCode) {
        qrResult = await window.generateQRCode(share);
      }

      // Container for QR + share words
      const shareBlock = document.createElement('div');
      shareBlock.style.marginBottom = '1.5em';

      // QR image
      if (qrResult && qrResult.qrCodeDataURI) {
        const img = document.createElement('img');
        img.src = qrResult.qrCodeDataURI;
        img.alt = `QR code for share ${shareIdx + 1}`;
        img.style.display = 'block';
        img.style.marginBottom = '8px';
        img.style.width = '200px';  // or your preferred size
        img.style.height = '200px';
        shareBlock.appendChild(img);
      }

      // Title
      const title = document.createElement('div');
      title.innerHTML = `<strong>Share ${shareIdx + 1}:</strong>`;
      shareBlock.appendChild(title);

      // Format words in 3 columns using table
      const words = share.split(' ');
      let tableHTML = '<table style="border-collapse: collapse;">';
      for (let i = 0; i < words.length; i += 3) {
        tableHTML += '<tr>';
        for (let j = 0; j < 3; j++) {
          const word = words[i + j] || '';
          tableHTML += `<td style="border: 1px solid #ccc; padding: 4px 8px; white-space: nowrap;">${word}</td>`;
        }
        tableHTML += '</tr>';
      }
      tableHTML += '</table>';

      const wordsDiv = document.createElement('div');
      wordsDiv.innerHTML = tableHTML;
      shareBlock.appendChild(wordsDiv);

      groupDiv.appendChild(shareBlock);
    }
  }
}

async function checkInternetConnection() {
    if (!navigator.onLine) return false;

    try {
        // Try fetching a small, fast resource
        const response = await fetch(window.location.origin, { method: 'HEAD', cache: 'no-store' });
        return response.ok;
    } catch {
        return false;
    }
}


function setupEventListeners() {
    document.getElementById('secure-clear').addEventListener('click', secureClear);

    document.getElementById('updateApp').addEventListener('click', async () => {
        try {
             // Step 1: Check network connectivity
            const online = await checkInternetConnection();
            if (!online) {
                alert("No internet connection detected. Please connect to the internet before updating.");
                return;
            }
            
            // Unregister service workers (optional)
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const reg of regs) await reg.unregister();
            }

            // Clear only the specific cache
            if ('caches' in window) {
                const cacheName = "wallet-pwa-v4";
                const deleted = await caches.delete(cacheName);
                if (deleted) {
                    console.log(`Cache "${cacheName}" cleared.`);
                } else {
                    console.log(`Cache "${cacheName}" not found.`);
                }
            }

            // Reload page to load latest version
            location.reload();
            // window.location.href = window.location.origin + window.location.pathname;

        } catch (err) {
            console.error('Error updating app:', err);
            alert('Failed to update app.');
        }
    });


    document.getElementById('recoverMnemonic').addEventListener('click', async () => {
        const passphrase = document.getElementById('passphrase').value || '';
        const re_passphrase = document.getElementById('repassphrase').value || '';

        const outputEl = document.getElementById('recoverResult');
        const secureEl = document.getElementById('secureResult');

        const mnemonicRecover = document.getElementById('mnemonicRecover');
        const keyRecover = document.getElementById('keyRecover');
        
        const mnemonicReEncrypt = document.getElementById('mnemonicReEncrypt');
        const keyReEncrypt = document.getElementById('keyReEncrypt');

        outputEl.innerHTML  ='';
        secureEl.innerHTML = ''; // Clear previous
        keyReEncrypt.innerHTML = '';
        mnemonicRecover.innerHTML = '';
        keyRecover.innerHTML = '';
        mnemonicReEncrypt.innerHTML = '';
        
        if(window.recoverFromAEStoString) {
            document.getElementById('mnemonicRecover').value = '';
            // console.log('generateShares result:', result);

            try {
                const result = window.recoverFromAEStoString(passphrase, document.getElementById('mnemonic').value, re_passphrase);
                const obj = typeof result === 'string' ? JSON.parse(result) : result;

                if (obj.error) {
                    outputEl.textContent = `Error: ${obj.error}`;
                    return;
                }

                if (obj.decrypted) {
                    // mnemonicRecover.textContent = "recovered mnemonic: "+ obj.decrypted;
                    // keyRecover.textContent = "recovered private: "+ obj.masterKeyHex;
                    
                    displayQR(obj.decrypted, "recovered mnemonic: <div class='text-box-wrap'>"+obj.decrypted +"</div>", mnemonicRecover)
                    displayQR(obj.masterKeyHex, "recovered Private: <div class='text-box-wrap'>"+obj.masterKeyHex + "</div>", keyRecover)

                    const newSharesGroups = JSON.parse(obj.shares);
                    await displaySharesWithQR(newSharesGroups, outputEl);
                }
                
                if (re_passphrase != ''){ 

                    if (obj.error) {
                        outputEl.textContent = `Error: ${obj.error}`;
                        return;
                    }
                    
                    // Display re-encrypted shares just like recovered shares
                    displayQR(obj.encMnemonic, "Mnemonic: <div class='text-box-wrap'>"+obj.encMnemonic + "</div>", mnemonicReEncrypt)
                    displayQR(obj.encMasterKeyHex, "Private: <div class='text-box-wrap'>"+obj.encMasterKeyHex + "</div>", keyReEncrypt)

                    const newSharesGroups = JSON.parse(obj.encShares);
                    await displaySharesWithQR(newSharesGroups, secureEl);

                }

            
            } catch (e) {
                document.getElementById('mnemonicRecover').textContent = String(result);
            }
        }
    });
    
    document.getElementById('recoverPrivate').addEventListener('click', async () => {
        const passphrase = document.getElementById('passphrase').value || '';
        const re_passphrase = document.getElementById('repassphrase').value || '';

        const outputEl = document.getElementById('recoverResult');
        const secureEl = document.getElementById('secureResult');

        const mnemonicRecover = document.getElementById('mnemonicRecover');
        const keyRecover = document.getElementById('keyRecover');
        
        const mnemonicReEncrypt = document.getElementById('mnemonicReEncrypt');
        const keyReEncrypt = document.getElementById('keyReEncrypt');

        outputEl.innerHTML  ='';
        secureEl.innerHTML = ''; // Clear previous
        keyReEncrypt.innerHTML = '';
        mnemonicRecover.innerHTML = '';
        keyRecover.innerHTML = '';
        mnemonicReEncrypt.innerHTML = '';

        if(window.recoverFromAEStoHex) {
            document.getElementById('keyRecover').value='';
            // console.log('generateShares result:', result);

            try {
                console.log(document.getElementById('privatekey').value);
                const result = window.recoverFromAEStoHex(passphrase, document.getElementById('privatekey').value, re_passphrase);
                const obj = typeof result === 'string' ? JSON.parse(result) : result;
                
                if (obj.decrypted) {
                    // mnemonicRecover.textContent = "recovered mnemonic: "+ obj.decrypted;
                    // keyRecover.textContent = "recovered private: "+ obj.decrypted;
                    
                    displayQR(obj.decrypted, "recovered Private: <div class='text-box-wrap'>"+obj.decrypted+"</div>", keyRecover)

                    const newSharesGroups = JSON.parse(obj.shares);
                    await displaySharesWithQR(newSharesGroups, outputEl);
                }
                
                if (re_passphrase != ''){ 

                    if (obj.error) {
                        outputEl.textContent = `Error: ${obj.error}`;
                        return;
                    }
                    
                    // Display re-encrypted shares just like recovered shares
                    // displayQR(obj.encMnemonic, "Mnemonic: "+obj.encMnemonic, mnemonicReEncrypt)
                    displayQR(obj.encMasterKeyHex, "Private: <div class='text-box-wrap'>"+obj.encMasterKeyHex+"</div>", keyReEncrypt)

                    const newSharesGroups = JSON.parse(obj.encShares);
                    await displaySharesWithQR(newSharesGroups, secureEl);

                }
            
            } catch (e) {
                document.getElementById('keyRecover').textContent = String(result);
            }
            
        }
    });

  document.getElementById('genBtn').addEventListener('click', async () => {
    const passphrase = document.getElementById('passphrase').value || '';
    if (window.generateShares) {
        const result = window.generateShares(passphrase);
        // console.log('generateShares result:', result);

        try {
            const obj = typeof result === 'string' ? JSON.parse(result) : result;
            if (obj.shares) {
                const sharesGroups = JSON.parse(obj.shares);
                outputDisplay =document.getElementById('genResult');
                mnemonicDisplay =document.getElementById('mnemonicResult');
                keyDisplay =document.getElementById('keyResult');
                outputDisplay.innerHTML = '';
                mnemonicDisplay.innerHTML = '';
                keyDisplay.innerHTML = '';
                await displaySharesWithQR(sharesGroups, outputDisplay);

                displayQR(obj.encMnemonic, "Mnemonic: <div class='text-box-wrap'>"+ obj.encMnemonic +"</div>", mnemonicDisplay)
                displayQR(obj.encMasterKeyHex, "Private: <div class='text-box-wrap'>"+ obj.encMasterKeyHex +"</div>", keyDisplay)

                // --- New: populate share1,2,3 and trigger recover ---
                if ( passphrase!= "" && sharesGroups[0] && sharesGroups[0].length >= 3) {
                    console.log("trigger recover botton....")
                    document.getElementById('share1').value = sharesGroups[0][0];
                    document.getElementById('share2').value = sharesGroups[0][1];
                    document.getElementById('share3').value = sharesGroups[0][2];

                    document.getElementById('mnemonic').value =  obj.encMnemonic
                    document.getElementById('privatekey').value = obj.encMasterKeyHex

                    // Trigger recover button click programmatically
                    document.getElementById('recoverBtn').click();

                    // document.getElementById('recoverMnemonic').click();
                    // document.getElementById('recoverPrivate').click();
                }
                    
            }
            

            // Also display mnemonic and masterKeyHex normally
            const outputEl = document.getElementById('genResult');
            outputEl.insertAdjacentHTML('afterbegin',
                `<div class='text-box-wrap'><strong>Mnemonic:</strong> ${obj.mnemonic}</div>` +
                `<div class='text-box-wrap'><strong>Master Key (hex):</strong> ${obj.masterKeyHex}</div>`
            );
        
        } catch (e) {
            document.getElementById('genResult').textContent = String(result);
        }
    } else {
        console.warn('generateShares function not found');
    }
});

document.getElementById('recoverBtn').addEventListener('click', async () => {
  const passphrase = document.getElementById('passphrase').value || '';
  const re_passphrase = document.getElementById('repassphrase').value || '';

    const outputEl = document.getElementById('recoverResult');
    const secureEl = document.getElementById('secureResult');

    const mnemonicRecover = document.getElementById('mnemonicRecover');
    const keyRecover = document.getElementById('keyRecover');
    
    const mnemonicReEncrypt = document.getElementById('mnemonicReEncrypt');
    const keyReEncrypt = document.getElementById('keyReEncrypt');

    outputEl.innerHTML  ='';
    secureEl.innerHTML = ''; // Clear previous
    keyReEncrypt.innerHTML = '';
    mnemonicRecover.innerHTML = '';
    keyRecover.innerHTML = '';
    mnemonicReEncrypt.innerHTML = '';
    
  const shares = [
    document.getElementById('share1').value.trim(),
    document.getElementById('share2').value.trim(),
    document.getElementById('share3').value.trim(),
  ].filter(Boolean);

  if (shares.length < 3) {
    alert('Please provide at least 3 shares to recover the secret.');
    return;
  }

  if (!window.recoverShares) {
    console.warn('recoverShares function not found');
    return;
  }

  try {
    const sharesGroups = [shares];
    const result = window.recoverShares(passphrase, JSON.stringify(sharesGroups));
    const obj = typeof result === 'string' ? JSON.parse(result) : result;

    if (obj.error) {
      outputEl.textContent = `Error: ${obj.error}`;
      return;
    }

    // Show recovered private key
    // outputEl.innerHTML = `<div><strong>Recovered Private Key (hex):</strong> ${obj.recoveredHex}</div>`;
    displayQR(obj.recoveredHex,"recovered private: <div class='text-box-wrap'>"+ obj.recoveredHex +"</div>", keyRecover)

    // Display regenerated shares
    if (obj.newShares) {
        const newSharesGroups = JSON.parse(obj.newShares);
        await displaySharesWithQR(newSharesGroups, outputEl);

        // Re-encrypt shares if re_passphrase is provided
        if (re_passphrase !== '' && window.reEncryptShares) {
            try {
                // Only pass re_passphrase and the recovered shares
                const reEncrypted = window.reEncryptShares(re_passphrase, obj.recoveredHex);
                const reEncryptedGroups = typeof reEncrypted === 'string' ? JSON.parse(reEncrypted) : reEncrypted;

                if (reEncryptedGroups.error) {
                    outputEl.textContent = `Error: ${reEncryptedGroups.error}`;
                    return;
                }
                
                // Display re-encrypted shares just like recovered shares

                displayQR(reEncryptedGroups.encMasterKeyHex, "Private: <div class='text-box-wrap'>"+reEncryptedGroups.encMasterKeyHex +"</div>", keyReEncrypt)

                const newSharesGroups = JSON.parse(reEncryptedGroups.shares);
                await displaySharesWithQR(newSharesGroups, secureEl);

                // displaySharesWithQR(reEncryptedGroups, secureEl);

                // console.log('Re-encrypted shares:', reEncryptedGroups);
            } catch (e) {
                secureEl.innerHTML = `Error re-encrypting shares: ${e.message}`;
            }
        }

    }
  } catch (e) {
    document.getElementById('recoverResult').textContent = String(e);
  }
});


// SCAN QRconst video = document.getElementById('video');
const scanQrBtn = document.getElementById('scanQrBtn');
const scanQrMnemonic = document.getElementById('scanQrMnemonic');
const scanQrPrivate = document.getElementById('scanQrPrivate');


scanQrMnemonic.addEventListener('click', () => {
  startQrScan(document.getElementById('videoMn'), document.getElementById('mnemonic'));
});

scanQrPrivate.addEventListener('click', () => {
  startQrScan(document.getElementById('videoPriv'), document.getElementById('privatekey'));
});

scanQrBtn.addEventListener('click', () => {
  startQrScan(document.getElementById('video'));
});

function startQrScan(video, output) {
  video.style.display = 'block';

  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(stream => {
      video.srcObject = stream;
      video.setAttribute("playsinline", true); // required for iOS
      video.play();
    //   requestAnimationFrame(tick);
      requestAnimationFrame(() => tick(video, output));
    })
    .catch(err => {
      alert('Error accessing camera: ' + err);
    });
}

async function tick(video, output) {
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
      if (!pngBlob) throw new Error('Failed to create JPEG blob from canvas');

      const arrayBuffer = await pngBlob.arrayBuffer();
      const jpegBytes = new Uint8Array(arrayBuffer);

      if (window.decodeQrFromImage) {
        const result = await window.decodeQrFromImage(jpegBytes);

        if (result.error) {
          console.warn('Go QR decode error:', result.error);
        } else if (result.text) {
            stopQrScan(video);

            const decodedStr = result.text;
            //   console.log('Decoded string:', decodedStr);
            // alert(decodedStr);
            if (output !== undefined) {
                // alert(output);
                output.value = decodedStr;
                return;
            }
            
            if (!document.getElementById('share1').value) {
                document.getElementById('share1').value = decodedStr;
            } else if (!document.getElementById('share2').value) {
                document.getElementById('share2').value = decodedStr;
            } else if (!document.getElementById('share3').value) {
                document.getElementById('share3').value = decodedStr;
            } else {
                alert('All three share inputs are full.');
            }
        } else {
          console.warn('Unexpected decodeQrFromImage result:', result);
        }
      }
    } catch (e) {
      console.error('Go QR decode error:', e);
    }
  }
  requestAnimationFrame(() => tick(video, output));
}


function stopQrScan(video) {
  video.style.display = 'none';
  const stream = video.srcObject;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  video.srcObject = null;
}



}

loadWasm();
