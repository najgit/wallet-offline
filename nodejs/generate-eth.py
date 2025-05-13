import os
from slip39 import slip39

# Configuration
threshold = 2      # Minimum shares needed to recover
num_shares = 3     # Total shares
passphrase = None  # Optional passphrase
identifier = "SLIP39 Example"

# 256-bit entropy for 33-word mnemonic
entropy = os.urandom(32)  # 32 bytes = 256 bits

# Create SLIP-39 master secret and shares
slip = Slip39.new_master_secret(
    threshold=threshold,
    groups=[(num_shares, threshold)],  # 1 group of 3 shares with threshold 2
    master_secret=entropy,
    passphrase=passphrase,
    identifier=identifier
)

# Print original 33-word master mnemonic
print("🔐 Master Mnemonic (33 words):")
print(" ".join(slip.mnemonics[0]))
print()

# Print all share mnemonics
print("📄 Shamir Shares (33 words each):")
for i, share in enumerate(slip.mnemonics):
    print(f"Share {i + 1}: {' '.join(share)}")

# Simulate recovery from any 2 shares
print("\n♻️ Recovered Master Mnemonic from 2 shares:")
recovered = Slip39.from_mnemonics(slip.mnemonics[:2], passphrase)
print(" ".join(recovered.mnemonics[0]))

