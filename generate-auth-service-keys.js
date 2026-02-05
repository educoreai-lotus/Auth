const { generateKeyPairSync } = require('crypto');
const fs = require('fs');
const path = require('path');

// Service identifier (used only for display and filenames)
const SERVICE_NAME = 'auth-service';

// Output filenames
const PRIVATE_KEY_FILENAME = `${SERVICE_NAME}-private-key.pem`;
const PUBLIC_KEY_FILENAME = `${SERVICE_NAME}-public-key.pem`;

// Absolute paths for write
const privateKeyPath = path.join(process.cwd(), PRIVATE_KEY_FILENAME);
const publicKeyPath = path.join(process.cwd(), PUBLIC_KEY_FILENAME);

try {
  // Generate ECDSA P-256 (prime256v1) key pair
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1', // aka P-256
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  // Write keys to files (overwrites if they already exist)
  fs.writeFileSync(privateKeyPath, privateKey, { encoding: 'utf8', mode: 0o600 });
  fs.writeFileSync(publicKeyPath, publicKey, { encoding: 'utf8', mode: 0o644 });

  // Console output - clear and easy to copy into Railway variables
  // These keys are for service-to-service authentication (NOT JWT signing keys)
  // Labels are explicit and repeat the service name for clarity
  const sep = '='.repeat(64);
  console.log(sep);
  console.log(`${SERVICE_NAME} Private Key (PEM, ECDSA P-256)`);
  console.log(sep);
  console.log(privateKey.trim());
  console.log(sep);
  console.log(`${SERVICE_NAME} Public Key (PEM, ECDSA P-256)`);
  console.log(sep);
  console.log(publicKey.trim());
  console.log(sep);

  // File location info and safety notes
  console.log(`\nSaved files:`);
  console.log(`  - ${PRIVATE_KEY_FILENAME}`);
  console.log(`  - ${PUBLIC_KEY_FILENAME}`);
  console.log('\n⚠︎ Do NOT commit or push these files. They are already covered by .gitignore patterns (*.pem).');
  console.log('Copy the PEM contents above into Railway environment variables as needed.');
} catch (error) {
  console.error('Failed to generate keys:', error.message);
  process.exit(1);
}

