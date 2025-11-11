export interface Message {
  username: string;
  text: string;
  imageUrl: string;
  stickerUrl: string;
  voiceUrl: string;
}

// const messageSchema = new mongoose.Schema({
//   username: { type: String, required: true },
//   text: { type: String },
//   imageUrl: { type: String },
//   stickerUrl: { type: String },
//   voiceUrl: { type: String },
//   createdAt: { type: Date, default: Date.now }
// });