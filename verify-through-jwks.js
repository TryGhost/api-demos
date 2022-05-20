/**
 * Prints out public key of signing key from /.well-known/jwks.json
 *
 *
 * Usage:
 *
 * node verify-through-jwks.js $URL $KID
 */

const jwksClient = require('jwks-client');

const url = process.argv[2] ?? 'http://localhost:2368';
const kid = process.argv[3] ?? 'bBJqjiXOK8Zoj9acStzZuSYOKvldLI5zkYuuB7yo-G4';

const client = jwksClient({
    strictSsl: false,
    jwksUri: `${url}/ghost/.well-known/jwks.json`
});

client.getSigningKey(kid, (err, key) => {
    if (err) {
        console.log(err);
        return;
    }
    const signingKey = key.publicKey;
    console.log(signingKey);
});
