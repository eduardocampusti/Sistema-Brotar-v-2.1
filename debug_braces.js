
const fs = require('fs');
const content = fs.readFileSync('d:/OneDrive/SISTEMA BROTAR/Sistema-Brotar-v-2.1/components/ClinicalPages.tsx', 'utf8');
const lines = content.split('\n');
let balance = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    balance += opens;
    balance -= closes;
    if (balance < 0) {
        console.log(`Imbalance detected at line ${i + 1}: balance is ${balance}`);
        console.log(`Line content: ${line}`);
        process.exit(1);
    }
}
console.log(`Final balance: ${balance}`);
