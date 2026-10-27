import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  initials: { type: String, required: true },
  color: { type: String, required: true }
}, { _id: false });

const roomSchema = new mongoose.Schema({
  roomKey: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  monthlyBudget: { type: Number, required: true, min: 100 },
  members: { type: [memberSchema], default: [] }
}, { timestamps: true });

export const Room = mongoose.model('Room', roomSchema);
