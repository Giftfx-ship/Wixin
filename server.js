const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// ==================== CURRENCIES ====================
const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', flag: '🇳🇬' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', flag: '🇰🇪' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', flag: '🇬🇭' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬' }
];

// ==================== USER SCHEMA ====================
const userSchema = new mongoose.Schema({
  fullName: String, email: { type: String, unique: true }, phone: String, country: String,
  currency: { type: String, default: 'USD' }, currencySymbol: { type: String, default: '$' },
  accountType: { type: String, default: 'Standard' }, transactionPin: String,
  accountNumber: String, accountName: String, iban: String, swiftCode: String,
  balance: { type: Number, default: 0 }, balanceHidden: { type: Boolean, default: false },
  theme: { type: String, default: 'light' },
  cards: [{ id: String, cardType: String, last4: String, cvv: String, expiry: String, limit: Number, active: Boolean, purchasedAt: Date }],
  transactions: [{ id: String, type: String, amount: Number, from: String, to: String, reference: String, bbcCodes: [String], status: String, date: Date }],
  beneficiaries: [{ id: String, name: String, accountNumber: String, bankName: String, addedAt: Date }],
  goals: [{ id: String, name: String, target: Number, saved: Number, deadline: Date, completed: Boolean, createdAt: Date }],
  achievements: [{ id: String, name: String, icon: String, description: String, earnedAt: Date }],
  investments: [{ id: String, type: String, name: String, amount: Number, value: Number, purchasedAt: Date }],
  loans: [{ id: String, type: String, amount: Number, interestRate: Number, term: Number, monthlyPayment: Number, remaining: Number, status: String, appliedAt: Date }],
  grants: [{ id: String, type: String, amount: Number, purpose: String, status: String, appliedAt: Date }],
  billPayments: [{ id: String, type: String, amount: Number, provider: String, accountNumber: String, date: Date }],
  crypto: [{ id: String, coin: String, symbol: String, amount: Number, value: Number, purchasedAt: Date }],
  insurances: [{ id: String, type: String, premium: Number, coverage: Number, status: String, purchasedAt: Date }],
  supportTickets: [{ id: String, subject: String, message: String, status: String, createdAt: Date }],
  isAdmin: { type: Boolean, default: false }, createdAt: Date
});

const User = mongoose.model('User', userSchema);

// ==================== EMAIL SETUP ====================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

function generateAccountNumber() { return 'PHT-' + Math.floor(1000+Math.random()*9000) + '-' + Math.floor(1000+Math.random()*9000); }
function generateIBAN() { return 'PH' + Math.floor(10+Math.random()*89) + Math.floor(100000000000+Math.random()*899999999999); }
function generateVerificationCode() { return Math.floor(100000+Math.random()*900000).toString(); }

// ==================== EMAIL FUNCTIONS ====================
async function sendVerificationEmail(email, code, name) {
  const html = `<div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; background: white; border-radius: 24px; overflow: hidden;"><div style="background: #0A2540; padding: 30px; text-align: center;"><h1 style="color: #F5A623;">🏦 PRIME HERITAGE</h1><p style="color: white;">TRUST BANK</p></div><div style="padding: 30px; text-align: center;"><h2>Hello, ${name}! 👋</h2><p>Your 6-digit verification code is:</p><div style="font-size: 48px; font-weight: bold; color: #F5A623; letter-spacing: 10px; background: #f5f5f5; padding: 20px; border-radius: 12px;">${code}</div><p style="margin-top: 20px;">⏰ Expires in 10 minutes</p></div></div>`;
  await transporter.sendMail({ from: `"Prime Heritage Bank" <${process.env.EMAIL_USER}>`, to: email, subject: '🔐 Your 6-Digit Verification Code', html });
}

async function sendWelcomeEmail(user) {
  const html = `<div style="font-family: Arial, sans-serif; max-width: 550px; margin: auto; background: white; border-radius: 24px;"><div style="background: #0A2540; padding: 30px; text-align: center;"><h1 style="color: #F5A623;">🏦 PRIME HERITAGE</h1></div><div style="padding: 30px;"><h2>🎉 Welcome, ${user.fullName}!</h2><p>Your account has been created.</p><div style="background: #f5f5f5; padding: 20px; border-radius: 12px;"><p><strong>Account:</strong> ${user.accountNumber}</p><p><strong>IBAN:</strong> ${user.iban}</p><p><strong>SWIFT:</strong> ${user.swiftCode}</p><p><strong>Currency:</strong> ${user.currency} ${user.currencySymbol}</p></div></div></div>`;
  await transporter.sendMail({ from: `"Prime Heritage Bank" <${process.env.EMAIL_USER}>`, to: user.email, subject: '🎉 Welcome to Prime Heritage Trust Bank!', html });
}

async function sendReceiptEmail(user, tx) {
  const html = `<div style="max-width:500px;margin:auto;background:#fff;border-radius:24px;padding:24px;"><h2>Receipt</h2><p>${tx.type}</p><p>Amount: ${user.currencySymbol}${tx.amount}</p><p>✅ Completed</p></div>`;
  await transporter.sendMail({ from: `"Prime Heritage Bank" <${process.env.EMAIL_USER}>`, to: user.email, subject: '📄 Transaction Receipt', html });
}

// ==================== BBC CODES (ONLY ADMIN KNOWS) ====================
const BBC = {
  TRANSFER: { P: 'PRI-7821-XK', S: 'SEC-3945-MN', F: 'FIN-6723-PQ' },
  WITHDRAW: { P: 'PRI-1593-AB', S: 'SEC-2674-CD', F: 'FIN-3815-EF' },
  CARD: { P: 'PRI-8642-GH', S: 'SEC-9753-IJ', F: 'FIN-6428-KL' },
  BILL: { P: 'PRI-3214-MN', S: 'SEC-5432-OP', F: 'FIN-7654-QR' }
};

// ==================== API ENDPOINTS ====================

app.get('/api/currencies', (req, res) => res.json(currencies));

app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, phone, country, currency, accountType, transactionPin } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ error: 'Email already registered' });
    const selectedCurrency = currencies.find(c => c.code === currency);
    const code = generateVerificationCode();
    global.tempUser = { fullName, email, phone, country, currency, currencySymbol: selectedCurrency?.symbol || '$', accountType, transactionPin, code, expires: Date.now() + 600000 };
    await sendVerificationEmail(email, code, fullName);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    const temp = global.tempUser;
    if (!temp || temp.email !== email || temp.code !== code || Date.now() > temp.expires) 
      return res.status(400).json({ error: 'Invalid or expired code' });
    const hashedPin = await bcrypt.hash(temp.transactionPin, 10);
    const accountNumber = generateAccountNumber();
    const iban = generateIBAN();
    const newUser = new User({
      fullName: temp.fullName, email: temp.email, phone: temp.phone, country: temp.country,
      currency: temp.currency, currencySymbol: temp.currencySymbol, accountType: temp.accountType,
      transactionPin: hashedPin, accountNumber: accountNumber, iban: iban, swiftCode: 'PRHTUS33',
      accountName: temp.fullName,
      achievements: [{ id: Date.now().toString(), name: 'Welcome to Prime Heritage', icon: 'fa-crown', description: 'Created your account', earnedAt: new Date() }],
      createdAt: new Date()
    });
    await newUser.save();
    await sendWelcomeEmail(newUser);
    const token = jwt.sign({ id: newUser._id, email: newUser.email }, process.env.JWT_SECRET);
    delete global.tempUser;
    res.json({ success: true, token, user: { id: newUser._id, fullName: newUser.fullName, email: newUser.email, accountNumber: newUser.accountNumber, balance: newUser.balance, currency: newUser.currency, currencySymbol: newUser.currencySymbol, accountType: newUser.accountType, isAdmin: newUser.isAdmin } });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, pin } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const isValid = await bcrypt.compare(pin, user.transactionPin);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET);
    res.json({ success: true, token, user: { id: user._id, fullName: user.fullName, email: user.email, accountNumber: user.accountNumber, balance: user.balance, balanceHidden: user.balanceHidden, currency: user.currency, currencySymbol: user.currencySymbol, accountType: user.accountType, theme: user.theme, isAdmin: user.isAdmin } });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/user/:id/toggle-balance', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.balanceHidden = !user.balanceHidden;
    await user.save();
    res.json({ success: true, balanceHidden: user.balanceHidden });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/user/:id/theme', async (req, res) => {
  try {
    const { theme } = req.body;
    const user = await User.findById(req.params.id);
    user.theme = theme;
    await user.save();
    res.json({ success: true, theme: user.theme });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/user/:id/change-pin', async (req, res) => {
  try {
    const { currentPin, newPin } = req.body;
    const user = await User.findById(req.params.id);
    const isValid = await bcrypt.compare(currentPin, user.transactionPin);
    if (!isValid) return res.status(401).json({ error: 'Current PIN incorrect' });
    user.transactionPin = await bcrypt.hash(newPin, 10);
    await user.save();
    res.json({ success: true, message: 'PIN changed successfully' });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// TRANSFER
app.post('/api/user/:id/transfer', async (req, res) => {
  try {
    const { recipient, amount, remark, pin, bbcCodes } = req.body;
    const user = await User.findById(req.params.id);
    const isValid = await bcrypt.compare(pin, user.transactionPin);
    if (!isValid) return res.status(401).json({ error: 'Invalid PIN' });
    const recipientUser = await User.findOne({ $or: [{ email: recipient }, { accountNumber: recipient }] });
    if (!recipientUser) return res.status(404).json({ error: 'Recipient not found' });
    if (user.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });
    if (bbcCodes[0] !== BBC.TRANSFER.P) return res.status(400).json({ error: 'Invalid BBC Code 1' });
    if (bbcCodes[1] !== BBC.TRANSFER.S) return res.status(400).json({ error: 'Invalid BBC Code 2' });
    if (bbcCodes[2] !== BBC.TRANSFER.F) return res.status(400).json({ error: 'Invalid BBC Code 3' });
    user.balance -= amount;
    recipientUser.balance += amount;
    const txId = 'TXN-' + Date.now();
    user.transactions.push({ id: txId, type: 'Transfer Sent', amount: -amount, to: recipientUser.fullName, reference: remark, bbcCodes, status: 'Completed', date: new Date() });
    recipientUser.transactions.push({ id: txId, type: 'Transfer Received', amount: amount, from: user.fullName, reference: remark, bbcCodes, status: 'Completed', date: new Date() });
    await user.save();
    await recipientUser.save();
    await sendReceiptEmail(user, { id: txId, type: 'Transfer Sent', amount });
    res.json({ success: true, newBalance: user.balance });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// WITHDRAW
app.post('/api/user/:id/withdraw', async (req, res) => {
  try {
    const { amount, bankName, accountNumber, accountName, pin, bbcCodes } = req.body;
    const user = await User.findById(req.params.id);
    const isValid = await bcrypt.compare(pin, user.transactionPin);
    if (!isValid) return res.status(401).json({ error: 'Invalid PIN' });
    if (user.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });
    if (!bankName || !accountNumber || !accountName) return res.status(400).json({ error: 'Please provide complete bank details' });
    if (bbcCodes[0] !== BBC.WITHDRAW.P) return res.status(400).json({ error: 'Invalid BBC Code 1' });
    if (bbcCodes[1] !== BBC.WITHDRAW.S) return res.status(400).json({ error: 'Invalid BBC Code 2' });
    if (bbcCodes[2] !== BBC.WITHDRAW.F) return res.status(400).json({ error: 'Invalid BBC Code 3' });
    user.balance -= amount;
    user.transactions.push({ id: 'WTH-' + Date.now(), type: 'Withdrawal', amount: -amount, to: `${bankName} - ${accountName} (${accountNumber})`, reference: 'Withdrawal Request', bbcCodes, status: 'Completed', date: new Date() });
    await user.save();
    await sendReceiptEmail(user, { id: 'WTH-' + Date.now(), type: 'Withdrawal', amount });
    res.json({ success: true, newBalance: user.balance });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// DEPOSIT
app.post('/api/user/:id/deposit', async (req, res) => {
  try {
    const { amount, pin, bbcCodes } = req.body;
    const user = await User.findById(req.params.id);
    const isValid = await bcrypt.compare(pin, user.transactionPin);
    if (!isValid) return res.status(401).json({ error: 'Invalid PIN' });
    if (bbcCodes[0] !== BBC.TRANSFER.P) return res.status(400).json({ error: 'Invalid BBC Code 1' });
    if (bbcCodes[1] !== BBC.TRANSFER.S) return res.status(400).json({ error: 'Invalid BBC Code 2' });
    if (bbcCodes[2] !== BBC.TRANSFER.F) return res.status(400).json({ error: 'Invalid BBC Code 3' });
    user.balance += amount;
    user.transactions.push({ id: 'DEP-' + Date.now(), type: 'Deposit', amount: amount, to: 'Self', reference: 'Cash Deposit', bbcCodes, status: 'Completed', date: new Date() });
    await user.save();
    await sendReceiptEmail(user, { id: 'DEP-' + Date.now(), type: 'Deposit', amount });
    res.json({ success: true, newBalance: user.balance });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// PURCHASE CARD
app.post('/api/user/:id/purchase-card', async (req, res) => {
  try {
    const { cardType, price, pin, bbcCodes } = req.body;
    const user = await User.findById(req.params.id);
    const isValid = await bcrypt.compare(pin, user.transactionPin);
    if (!isValid) return res.status(401).json({ error: 'Invalid PIN' });
    if (user.balance < price) return res.status(400).json({ error: 'Insufficient balance' });
    if (bbcCodes[0] !== BBC.CARD.P) return res.status(400).json({ error: 'Invalid BBC Code 1' });
    if (bbcCodes[1] !== BBC.CARD.S) return res.status(400).json({ error: 'Invalid BBC Code 2' });
    if (bbcCodes[2] !== BBC.CARD.F) return res.status(400).json({ error: 'Invalid BBC Code 3' });
    const cardNumber = Math.floor(1000+Math.random()*9000).toString() + Math.floor(1000+Math.random()*9000).toString() + Math.floor(1000+Math.random()*9000).toString() + Math.floor(1000+Math.random()*9000).toString();
    user.balance -= price;
    user.cards.push({ id: 'CARD-'+Date.now(), cardType, last4: cardNumber.slice(-4), cvv: Math.floor(100+Math.random()*900), expiry: new Date(Date.now()+(cardType==='Starter'?30:90)*24*60*60*1000).toISOString().slice(2,7), limit: cardType==='Starter'?500:2000, active: true, purchasedAt: new Date() });
    user.transactions.push({ id: 'TXN-'+Date.now(), type: 'Card Purchase', amount: -price, to: `${cardType} Card`, reference: `Purchased ${cardType} Card`, bbcCodes, status: 'Completed', date: new Date() });
    await user.save();
    await sendReceiptEmail(user, { id: 'CARD-'+Date.now(), type: 'Card Purchase', amount: price });
    res.json({ success: true, newBalance: user.balance, card: user.cards[user.cards.length-1] });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// PAY BILL
app.post('/api/user/:id/pay-bill', async (req, res) => {
  try {
    const { billType, amount, provider, accountNumber, pin, bbcCodes } = req.body;
    const user = await User.findById(req.params.id);
    const isValid = await bcrypt.compare(pin, user.transactionPin);
    if (!isValid) return res.status(401).json({ error: 'Invalid PIN' });
    if (user.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });
    if (bbcCodes[0] !== BBC.BILL.P) return res.status(400).json({ error: 'Invalid BBC Code 1' });
    if (bbcCodes[1] !== BBC.BILL.S) return res.status(400).json({ error: 'Invalid BBC Code 2' });
    if (bbcCodes[2] !== BBC.BILL.F) return res.status(400).json({ error: 'Invalid BBC Code 3' });
    user.balance -= amount;
    user.transactions.push({ id: 'BILL-'+Date.now(), type: 'Bill Payment', amount: -amount, to: billType, reference: `${billType} - ${provider} (${accountNumber})`, bbcCodes, status: 'Completed', date: new Date() });
    user.billPayments.push({ id: 'BILL-'+Date.now(), type: billType, amount, provider, accountNumber, date: new Date() });
    await user.save();
    await sendReceiptEmail(user, { id: 'BILL-'+Date.now(), type: 'Bill Payment', amount });
    res.json({ success: true, newBalance: user.balance });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// CREATE GOAL
app.post('/api/user/:id/create-goal', async (req, res) => {
  try {
    const { name, target, deadline } = req.body;
    const user = await User.findById(req.params.id);
    user.goals.push({ id: 'GOAL-'+Date.now(), name, target, saved: 0, deadline: new Date(deadline), completed: false, createdAt: new Date() });
    await user.save();
    res.json({ success: true, goal: user.goals[user.goals.length-1] });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// ADD TO GOAL
app.post('/api/user/:id/add-to-goal', async (req, res) => {
  try {
    const { goalId, amount } = req.body;
    const user = await User.findById(req.params.id);
    if (user.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });
    const goal = user.goals.id(goalId);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    user.balance -= amount;
    goal.saved += amount;
    user.transactions.push({ id: 'TXN-'+Date.now(), type: 'Savings Contribution', amount: -amount, to: `Goal: ${goal.name}`, reference: `Added to ${goal.name}`, status: 'Completed', date: new Date() });
    if (goal.saved >= goal.target && !goal.completed) {
      goal.completed = true;
      user.achievements.push({ id: Date.now().toString(), name: `Goal Achieved: ${goal.name}`, icon: 'fa-bullseye', description: 'Reached your savings goal', earnedAt: new Date() });
    }
    await user.save();
    res.json({ success: true, newBalance: user.balance });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// APPLY LOAN
app.post('/api/user/:id/apply-loan', async (req, res) => {
  try {
    const { loanType, amount, term, purpose, employmentStatus, monthlyIncome } = req.body;
    const user = await User.findById(req.params.id);
    const rates = { Personal: 9.9, Mortgage: 4.5, Auto: 6.8, Business: 7.2, Student: 3.5, 'Home Equity': 6.2 };
    const interestRate = rates[loanType] || 9.9;
    const monthlyPayment = (amount * (interestRate / 100 / 12) * Math.pow(1 + interestRate / 100 / 12, term)) / (Math.pow(1 + interestRate / 100 / 12, term) - 1);
    user.loans.push({ id: 'LOAN-'+Date.now(), type: loanType, amount, interestRate, term, monthlyPayment, remaining: amount, status: 'Pending', appliedAt: new Date() });
    await user.save();
    res.json({ success: true, message: `${loanType} Loan application submitted` });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// APPLY GRANT
app.post('/api/user/:id/apply-grant', async (req, res) => {
  try {
    const { grantType, amount, purpose, organization, timeline } = req.body;
    const user = await User.findById(req.params.id);
    user.grants.push({ id: 'GRANT-'+Date.now(), type: grantType, amount, purpose, status: 'Pending', appliedAt: new Date() });
    await user.save();
    res.json({ success: true, message: `${grantType} Grant application submitted` });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// INVEST
app.post('/api/user/:id/invest', async (req, res) => {
  try {
    const { investmentType, amount, name, riskLevel } = req.body;
    const user = await User.findById(req.params.id);
    if (user.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });
    user.balance -= amount;
    user.investments.push({ id: 'INV-'+Date.now(), type: investmentType, name, amount, value: amount, purchasedAt: new Date() });
    user.transactions.push({ id: 'TXN-'+Date.now(), type: 'Investment Purchase', amount: -amount, to: name, reference: `Invested in ${name}`, status: 'Completed', date: new Date() });
    await user.save();
    res.json({ success: true, newBalance: user.balance });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// BUY CRYPTO
app.post('/api/user/:id/buy-crypto', async (req, res) => {
  try {
    const { coin, amount, price } = req.body;
    const user = await User.findById(req.params.id);
    const total = amount * price;
    if (user.balance < total) return res.status(400).json({ error: 'Insufficient balance' });
    user.balance -= total;
    user.crypto.push({ id: 'CRYPTO-'+Date.now(), coin, symbol: coin.slice(0,3).toUpperCase(), amount, value: total, purchasedAt: new Date() });
    user.transactions.push({ id: 'TXN-'+Date.now(), type: 'Crypto Purchase', amount: -total, to: coin, reference: `Bought ${amount} ${coin}`, status: 'Completed', date: new Date() });
    await user.save();
    res.json({ success: true, newBalance: user.balance });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// INSURANCE
app.post('/api/user/:id/buy-insurance', async (req, res) => {
  try {
    const { insuranceType, premium, coverage } = req.body;
    const user = await User.findById(req.params.id);
    if (user.balance < premium) return res.status(400).json({ error: 'Insufficient balance' });
    user.balance -= premium;
    user.insurances.push({ id: 'INS-'+Date.now(), type: insuranceType, premium, coverage, status: 'Active', purchasedAt: new Date() });
    user.transactions.push({ id: 'TXN-'+Date.now(), type: 'Insurance Purchase', amount: -premium, to: `${insuranceType} Insurance`, reference: `Purchased ${insuranceType} Insurance`, status: 'Completed', date: new Date() });
    await user.save();
    res.json({ success: true, newBalance: user.balance });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// SUPPORT TICKET
app.post('/api/user/:id/support-ticket', async (req, res) => {
  try {
    const { subject, message, category, priority } = req.body;
    const user = await User.findById(req.params.id);
    user.supportTickets.push({ id: 'TICKET-'+Date.now(), subject, message, category, priority, status: 'Open', createdAt: new Date() });
    await user.save();
    res.json({ success: true, message: 'Support ticket created' });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// ADD BENEFICIARY
app.post('/api/user/:id/add-beneficiary', async (req, res) => {
  try {
    const { name, accountNumber, bankName } = req.body;
    const user = await User.findById(req.params.id);
    user.beneficiaries.push({ id: 'BEN-'+Date.now(), name, accountNumber, bankName, addedAt: new Date() });
    await user.save();
    res.json({ success: true, beneficiary: user.beneficiaries[user.beneficiaries.length-1] });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// ==================== ADMIN ENDPOINTS ====================
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find({}, '-transactionPin');
    res.json(users);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/send-money', async (req, res) => {
  try {
    const { recipientEmail, amount, note } = req.body;
    const recipient = await User.findOne({ email: recipientEmail });
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
    recipient.balance += amount;
    recipient.transactions.push({ id: 'ADMIN-'+Date.now(), type: 'Bank Credit', amount, from: 'Prime Heritage Bank', reference: note, bbcCodes: ['ADMIN-0000-XX'], status: 'Completed', date: new Date() });
    await recipient.save();
    await sendReceiptEmail(recipient, { id: 'ADMIN-'+Date.now(), type: 'Bank Credit', amount });
    res.json({ success: true, message: `Sent ${amount} to ${recipient.fullName}` });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBalance = await User.aggregate([{ $group: { _id: null, total: { $sum: '$balance' } } }]);
    res.json({ totalUsers, totalBalance: totalBalance[0]?.total || 0 });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Prime Heritage Bank running on port ${PORT}`);
  console.log(`📧 Email: primeheritagebankk@gmail.com`);
  console.log(`👑 Admin: admin@primeheritage.com / PIN: 0000`);
});
