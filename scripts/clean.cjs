#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const target = path.resolve(process.cwd(), 'dist');

try {
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`Removed ${target}`);
} catch (error) {
  console.error(`Failed to remove ${target}:`, error);
  process.exitCode = 1;
}
