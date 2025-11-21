export interface Message {
  id: string;
  username: string;
  text: string;
  imageUrl?: string;
  stickerUrl?: string;
  voiceUrl?: string;
  createdAt: string;
}

// const messageSchema = new mongoose.Schema({
//   username: { type: String, required: true },
//   text: { type: String },
//   imageUrl: { type: String },
//   stickerUrl: { type: String },
//   voiceUrl: { type: String },
//   createdAt: { type: Date, default: Date.now }
// });

export interface MessageResponseModel {
  id: string,
  username: string,
  text: string,
  createdAt: string,
}

