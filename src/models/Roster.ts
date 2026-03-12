// src/models/Roster.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IShift {
  driverId: mongoose.Types.ObjectId;
  driverName: string;
  date: Date;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface IRoster extends Document {
  periodStart: Date;
  periodEnd: Date;
  status: 'draft' | 'published';
  shifts: IShift[];
  createdBy: mongoose.Types.ObjectId;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ShiftSchema = new Schema<IShift>(
  {
    driverId: { type: Schema.Types.ObjectId, ref: 'Driver', required: true },
    driverName: { type: String, required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    notes: { type: String, maxlength: 100, default: '' },
  },
  { _id: false }
);

const RosterSchema = new Schema<IRoster>(
  {
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    shifts: { type: [ShiftSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

// Compound index for period lookups
RosterSchema.index({ periodStart: 1, status: 1 });
// Index for driver shift queries
RosterSchema.index({ 'shifts.driverId': 1 });

const Roster: Model<IRoster> =
  mongoose.models.Roster || mongoose.model<IRoster>('Roster', RosterSchema);

export default Roster;
