# Encrypted Credential Storage

## Overview

The Login component now includes secure encrypted credential storage for the "Remember Me" functionality. This ensures that user credentials are not stored in plain text in localStorage.

## Security Features

### 1. AES Encryption

- Uses **CryptoJS AES encryption** to encrypt credentials before storage
- Credentials are encrypted with a secure key before being stored in localStorage
- Only the encrypted data is stored, never plain text credentials

### 2. Automatic Expiration

- Encrypted credentials automatically expire after **30 days**
- Expired credentials are automatically cleared from storage
- Prevents indefinite storage of potentially compromised credentials

### 3. Secure Key Management

- Uses a predefined encryption key: `mhu-softphone-2024-secure-key-v1`
- In production, this should be derived from device-specific data for enhanced security

## Implementation Details

### Storage Process

1. When user checks "Remember Me" and logs in successfully:
   - Credentials (email, password, host) are encrypted using AES
   - Encrypted data is stored in localStorage as `encryptedCredentials`
   - A timestamp is included for expiration tracking

### Retrieval Process

1. When the app loads:
   - Checks if "Remember Me" was previously enabled
   - Attempts to decrypt stored credentials
   - Validates timestamp (30-day expiration)
   - Auto-fills form fields if credentials are valid

### Security Measures

- **No plain text storage**: All credentials are encrypted before storage
- **Automatic cleanup**: Expired or invalid credentials are automatically removed
- **Logout clearing**: Credentials are cleared when user logs out
- **Error handling**: Failed encryption/decryption operations are handled gracefully

## Usage

### For Users

1. Check "Remember Me" checkbox during login
2. Credentials will be securely saved for future logins
3. Next time you open the app, fields will be auto-filled
4. Credentials automatically expire after 30 days

### For Developers

```javascript
// Store encrypted credentials
const success = storeEncryptedCredentials(email, password, host);

// Retrieve encrypted credentials
const credentials = getEncryptedCredentials();

// Clear encrypted credentials
clearEncryptedCredentials();
```

## Security Considerations

### Current Implementation

- ✅ AES encryption for credential storage
- ✅ Automatic expiration (30 days)
- ✅ Secure cleanup on logout
- ✅ Error handling for failed operations

### Future Enhancements

- 🔄 Device-specific encryption key derivation
- 🔄 Biometric authentication for credential access
- 🔄 Hardware security module integration
- 🔄 Key rotation mechanisms

## Files Modified

- `src/components/Login.jsx` - Added encryption/decryption functions and updated remember me logic
- `package.json` - Added crypto-js dependency

## Dependencies

- `crypto-js` - For AES encryption/decryption functionality

## Testing

1. Enable "Remember Me" and login
2. Close and reopen the app
3. Verify credentials are auto-filled
4. Test logout clears credentials
5. Test expiration after 30 days (modify timestamp for testing)
