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


function setupEventListeners() {
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

            displayQR(obj.encMnemonic, obj.encMnemonic, mnemonicDisplay)
            displayQR(obj.encMasterKeyHex, obj.encMasterKeyHex, keyDisplay)

            // --- New: populate share1,2,3 and trigger recover ---
            if ( passphrase!= "" && sharesGroups[0] && sharesGroups[0].length >= 3) {
                console.log("trigger recover botton....")
                document.getElementById('share1').value = sharesGroups[0][0];
                document.getElementById('share2').value = sharesGroups[0][1];
                document.getElementById('share3').value = sharesGroups[0][2];

                // Trigger recover button click programmatically
                document.getElementById('recoverBtn').click();
            }
                
        }
        

        // Also display mnemonic and masterKeyHex normally
        const outputEl = document.getElementById('genResult');
        outputEl.insertAdjacentHTML('afterbegin',
            `<div><strong>Mnemonic:</strong> ${obj.mnemonic}</div>` +
            `<div><strong>Master Key (hex):</strong> ${obj.masterKeyHex}</div>`
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
    const outputEl = document.getElementById('recoverResult');
    const secureEl = document.getElementById('secureResult');
    secureEl.innerHTML = ''; // Clear previous

    const obj = typeof result === 'string' ? JSON.parse(result) : result;

    if (obj.error) {
      outputEl.textContent = `Error: ${obj.error}`;
      return;
    }

    // Show recovered private key
    outputEl.innerHTML = `<div><strong>Recovered Private Key (hex):</strong> ${obj.recoveredHex}</div>`;

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
            alert(decodedStr);
            if (output != 'undefined') {
                alert(output);
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
