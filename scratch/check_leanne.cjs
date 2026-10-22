const fs = require('fs');
const str = fs.readFileSync('leanne_metadata.txt', 'utf8');
const data = JSON.parse(str.replace(/^\s+|\s+$/g, ''));
console.log(Object.keys(data).filter(k => k.toLowerCase().includes('interview') || k.toLowerCase().includes('answer') || k.toLowerCase().includes('pronunciation')));
