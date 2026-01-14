#!/usr/bin/env node
/**
 * Check prerequisites for building native modules
 * Run: node scripts/check-native-prerequisites.js
 */

const { execSync } = require('child_process');
const os = require('os');

console.log('='.repeat(60));
console.log('Native Module Build Prerequisites Check');
console.log('='.repeat(60));
console.log();

let allPassed = true;

// Check OS
console.log('1. Operating System');
if (os.platform() === 'win32') {
  console.log('   ✓ Windows detected');
} else {
  console.log(`   ⚠ ${os.platform()} detected - Native AppBar only works on Windows`);
  console.log('   The app will use fallback mode (always-on-top) on this platform');
}
console.log();

// Check Node.js version
console.log('2. Node.js');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
if (majorVersion >= 16) {
  console.log(`   ✓ Node.js ${nodeVersion} (>= 16 required)`);
} else {
  console.log(`   ✗ Node.js ${nodeVersion} - Version 16 or higher required`);
  allPassed = false;
}
console.log();

// Check npm
console.log('3. npm');
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`   ✓ npm ${npmVersion}`);
} catch (err) {
  console.log('   ✗ npm not found');
  allPassed = false;
}
console.log();

// Check Python (required by node-gyp)
console.log('4. Python');
try {
  const pythonVersion = execSync('python --version 2>&1', { encoding: 'utf8' }).trim();
  if (pythonVersion.includes('Python 3') || pythonVersion.includes('Python 2')) {
    console.log(`   ✓ ${pythonVersion}`);
  } else {
    throw new Error('Python version not detected');
  }
} catch (err) {
  try {
    const python3Version = execSync('python3 --version 2>&1', { encoding: 'utf8' }).trim();
    console.log(`   ✓ ${python3Version}`);
  } catch (err2) {
    console.log('   ✗ Python not found');
    console.log('   Install from: https://www.python.org/downloads/');
    console.log('   Make sure to check "Add Python to PATH" during installation');
    allPassed = false;
  }
}
console.log();

// Check for Visual Studio Build Tools (Windows only)
if (os.platform() === 'win32') {
  console.log('5. Visual Studio Build Tools');
  
  const vsLocations = [
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\BuildTools',
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Community',
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Professional',
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Enterprise',
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\BuildTools',
  ];
  
  const fs = require('fs');
  let vsFound = false;
  
  for (const loc of vsLocations) {
    if (fs.existsSync(loc)) {
      console.log(`   ✓ Found: ${loc}`);
      vsFound = true;
      break;
    }
  }
  
  if (!vsFound) {
    console.log('   ✗ Visual Studio Build Tools not found');
    console.log('   Install from: https://visualstudio.microsoft.com/downloads/');
    console.log('   Select "Desktop development with C++" workload');
    allPassed = false;
  }
  console.log();
}

// Check node-gyp
console.log('6. node-gyp');
try {
  const gypVersion = execSync('node-gyp --version', { encoding: 'utf8' }).trim();
  console.log(`   ✓ node-gyp ${gypVersion}`);
} catch (err) {
  console.log('   ⚠ node-gyp not installed globally (will use local version)');
  console.log('   To install globally: npm install -g node-gyp');
}
console.log();

// Summary
console.log('='.repeat(60));
if (allPassed) {
  console.log('✓ All prerequisites met! You can build the native module.');
  console.log();
  console.log('Build commands:');
  console.log('  npm run build:native    - Full build (install deps + compile)');
  console.log('  npm run rebuild:native  - Rebuild only (after code changes)');
} else {
  console.log('✗ Some prerequisites are missing. Please install them first.');
  process.exit(1);
}
console.log('='.repeat(60));
