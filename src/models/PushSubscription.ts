import mongoose, { Schema, Document, Model } from 'mongoose';

export interface PushSubscriptionDoc extends Document {
  userId: Schema.Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<PushSubscriptionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'User' },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: true }
);

const PushSubscription: Model<PushSubscriptionDoc> =
  mongoose.models.PushSubscription ||
  mongoose.model<PushSubscriptionDoc>('PushSubscription', PushSubscriptionSchema);

export default PushSubscription;


