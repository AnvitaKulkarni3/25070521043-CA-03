import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  roomKey: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 80 },
  amount: { type: Number, required: true, min: 0.01 },
  category: { type: String, required: true },
  paidBy: { type: String, required: true },
  paidByName: { type: String, required: true },
  splitAmong: { type: [String], required: true },
  date: { type: Date, required: true, index: true },
  note: { type: String, maxlength: 180, default: '' }
}, { timestamps: true });

export const Expense = mongoose.model('Expense', expenseSchema);
