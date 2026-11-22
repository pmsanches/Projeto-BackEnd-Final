require('dotenv').config();
const jwt = require('jsonwebtoken');

const id = Number(process.argv[2]) || 1;
const token = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });

console.log(token);