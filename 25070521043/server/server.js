import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Expense } from './models/Expense.js';
import { Room } from './models/Room.js';
import { roommates } from './seed.js';
import { buildPrediction } from './services/predictionService.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: '100kb' }));

const categories = ['Groceries', 'Food', 'Utilities', 'Transport', 'Entertainment', 'Other'];
const ROOM_ID = 'hostel-room-demo';

function validDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function ensureRoom() {
  let room = await Room.findOne({ roomKey: ROOM_ID });
  if (!room) {
    room = await Room.create({
      roomKey: ROOM_ID,
      name: 'Maple Hostel · Room 204',
      monthlyBudget: 12000,
      members: roommates
    });
  }
  return room;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.get('/api/roommates', async (_req, res, next) => {
  try {
    const room = await ensureRoom();
    res.json({ roommates: room.members.map(m => ({ id: m.id, name: m.name, initials: m.initials, color: m.color })) });
  } catch (err) { next(err); }
});

app.get('/api/dashboard', async (_req, res, next) => {
  try {
    const room = await ensureRoom();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const expenses = await Expense.find({ roomKey: ROOM_ID, date: { $gte: monthStart, $lt: monthEnd } })
      .sort({ date: -1, createdAt: -1 }).lean();
    const allExpenses = await Expense.find({ roomKey: ROOM_ID }).sort({ date: 1 }).lean();
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const categoryMap = {};
    for (const e of expenses) categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    const prediction = buildPrediction({
      expenses: allExpenses,
      monthlyBudget: room.monthlyBudget,
      now
    });
    res.json({
      room: { name: room.name, monthlyBudget: room.monthlyBudget, members: room.members },
      totalSpent,
      remainingBudget: room.monthlyBudget - totalSpent,
      expenseCount: expenses.length,
      categories: Object.entries(categoryMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      recentExpenses: expenses.slice(0, 8),
      prediction
    });
  } catch (err) { next(err); }
});

app.get('/api/expenses', async (_req, res, next) => {
  try {
    const expenses = await Expense.find({ roomKey: ROOM_ID }).sort({ date: -1, createdAt: -1 }).limit(100).lean();
    res.json({ expenses });
  } catch (err) { next(err); }
});

app.post('/api/expenses', async (req, res, next) => {
  try {
    const { title, amount, category, paidBy, splitAmong, date, note } = req.body || {};
    const numericAmount = Number(amount);
    const dateValue = validDate(date);
    const room = await ensureRoom();
    const memberIds = room.members.map(m => m.id);
    if (!title || typeof title !== 'string' || title.trim().length > 80) {
      return res.status(400).json({ error: 'Enter a title of 1–80 characters.' });
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 1000000) {
      return res.status(400).json({ error: 'Amount must be greater than ₹0 and no more than ₹10,00,000.' });
    }
    if (!categories.includes(category)) return res.status(400).json({ error: 'Choose a valid expense category.' });
    if (!memberIds.includes(paidBy)) return res.status(400).json({ error: 'Choose a valid payer.' });
    if (!dateValue) return res.status(400).json({ error: 'Choose a valid date.' });
    const participants = Array.isArray(splitAmong) ? [...new Set(splitAmong)].filter(id => memberIds.includes(id)) : [];
    if (!participants.length) return res.status(400).json({ error: 'Choose at least one roommate to split this expense.' });
    const payer = room.members.find(m => m.id === paidBy);
    const expense = await Expense.create({
      roomKey: ROOM_ID,
      title: title.trim(),
      amount: Math.round(numericAmount * 100) / 100,
      category,
      paidBy,
      paidByName: payer.name,
      splitAmong: participants,
      date: dateValue,
      note: typeof note === 'string' ? note.trim().slice(0, 180) : ''
    });
    res.status(201).json({ expense });
  } catch (err) { next(err); }
});

app.delete('/api/expenses/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid expense ID.' });
    const deleted = await Expense.findOneAndDelete({ _id: req.params.id, roomKey: ROOM_ID });
    if (!deleted) return res.status(404).json({ error: 'Expense not found.' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

app.put('/api/budget', async (req, res, next) => {
  try {
    const amount = Number(req.body?.monthlyBudget);
    if (!Number.isFinite(amount) || amount < 100 || amount > 10000000) {
      return res.status(400).json({ error: 'Monthly budget must be between ₹100 and ₹1,00,00,000.' });
    }
    const room = await ensureRoom();
    room.monthlyBudget = Math.round(amount * 100) / 100;
    await room.save();
    res.json({ monthlyBudget: room.monthlyBudget });
  } catch (err) { next(err); }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.name === 'ValidationError') return res.status(400).json({ error: 'Some expense fields are invalid.' });
  res.status(500).json({ error: 'Something went wrong on the server. Check the server terminal.' });
});

async function start() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trackmyspend';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB.');
    await ensureRoom();
    const clientDist = path.resolve(__dirname, '../client/dist');
    if (process.env.NODE_ENV === 'production') {
      app.use(express.static(clientDist));
      app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
    }
    app.listen(PORT, () => console.log(`TrackMySpend API listening on http://localhost:${PORT}`));
  } catch (error) {
    console.error(`Could not connect to MongoDB at ${uri}`);
    console.error('Start MongoDB Community Server and verify MONGODB_URI in .env.');
    console.error(error.message);
    process.exit(1);
  }
}

start();
