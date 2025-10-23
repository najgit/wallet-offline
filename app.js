const go = new Go();

async function loadWasm() {
  const result = await WebAssembly.instantiateStreaming(fetch('main.wasm'), go.importObject);
  go.run(result.instance);

  // Now WASM is ready, set up event listeners
  setupEventListeners();
}

async function displaySharesWithQR(sharesGroups, outputEl) {
//   const outputEl = document.getElementById('genResult');
  outputEl.innerHTML = ''; // clear previous

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
        console.log('generateShares result:', result);

        try {
        const obj = typeof result === 'string' ? JSON.parse(result) : result;
        if (obj.shares) {
            const sharesGroups = JSON.parse(obj.shares);
            await displaySharesWithQR(sharesGroups, document.getElementById('genResult'));
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

document.getElementById('recoverBtn').addEventListener('click', () => {
  const passphrase = document.getElementById('passphrase').value || '';
  const shares = [
    document.getElementById('share1').value.trim(),
    document.getElementById('share2').value.trim(),
    document.getElementById('share3').value.trim(),
  ].filter(Boolean);

  if (shares.length < 3) {
    alert('Please provide at least 3 shares to recover the secret.');
    return;
  }

  if (window.recoverShares) {
    const sharesGroups = [shares];
    const result = window.recoverShares(passphrase, JSON.stringify(sharesGroups));

    console.log('recoverShares result:', result);

    const outputEl = document.getElementById('recoverResult');
    try {
      const obj = typeof result === 'string' ? JSON.parse(result) : result;

      if (obj.error) {
        outputEl.textContent = `Error: ${obj.error}`;
        return;
      }

      outputEl.innerHTML = `<div><strong>Recovered Private Key (hex):</strong> ${obj.recoveredHex}</div>`;

      // Display regenerated shares like generateShares
      if (obj.newShares) {
        const newSharesGroups = JSON.parse(obj.newShares); 

        let formattedShares = '';

        newSharesGroups.forEach((group, groupIdx) => {
          formattedShares += `<div><strong>New Group ${groupIdx + 1}:</strong></div>`;
          group.forEach((share, shareIdx) => {
            formattedShares += `<div style="margin-bottom: 1em;">
              <strong>Share ${shareIdx + 1}:</strong><br/>`;

            // Add QR code container
            const qrId = `newShareQR-${groupIdx}-${shareIdx}`;
            formattedShares += `<canvas id="${qrId}" style="margin-bottom: 0.5em;"></canvas><br/>`;

            // Share words in 3 columns
            const words = share.split(' ');
            formattedShares += '<table style="border-collapse: collapse;">';
            for (let i = 0; i < words.length; i += 3) {
              formattedShares += '<tr>';
              for (let j = 0; j < 3; j++) {
                const word = words[i + j];
                if (word) {
                  formattedShares += `<td style="border: 1px solid #ccc; padding: 4px 8px; white-space: nowrap;">${word}</td>`;
                } else {
                  formattedShares += '<td></td>';
                }
              }
              formattedShares += '</tr>';
            }
            formattedShares += '</table></div>';
          });
        });

        outputEl.innerHTML += `<div><strong>New Shares:</strong></div>${formattedShares}`;

        displaySharesWithQR(newSharesGroups, outputEl);
    

        // After inserting HTML, generate QR codes for each new share using JS QR lib
        // newSharesGroups.forEach((group, groupIdx) => {
        //   group.forEach((share, shareIdx) => {
        //     const qrId = `newShareQR-${groupIdx}-${shareIdx}`;
        //     const canvas = document.getElementById(qrId);
        //     if (canvas) {
        //       QRCode.toCanvas(canvas, share, { errorCorrectionLevel: 'M', margin: 1 }, function (error) {
        //         if (error) console.error(error);
        //       });
        //     }
        //   });
        // });

      }
    } catch (e) {
      outputEl.textContent = String(result);
    }
  } else {
    console.warn('recoverShares function not found');
  }
});

// SCAN QRconst video = document.getElementById('video');
const scanQrBtn = document.getElementById('scanQrBtn');

scanQrBtn.addEventListener('click', () => {
  startQrScan();
});

function startQrScan() {
  video.style.display = 'block';

  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(stream => {
      video.srcObject = stream;
      video.setAttribute("playsinline", true); // required for iOS
      video.play();
      requestAnimationFrame(tick);
    })
    .catch(err => {
      alert('Error accessing camera: ' + err);
    });
}

async function tick() {
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
          stopQrScan();

          const decodedStr = result.text;
          console.log('Decoded string:', decodedStr);

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
  requestAnimationFrame(tick);
}


function stopQrScan() {
  video.style.display = 'none';
  const stream = video.srcObject;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  video.srcObject = null;
}



}

loadWasm();
