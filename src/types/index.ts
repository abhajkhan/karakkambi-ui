export interface MessagePayload {
  text: string
  imageUrl?: string
  stickerUrl?: string
  voiceUrl?: string
  replyTo?: string | null
}

export interface Message extends MessagePayload {
  id: string
  createdAt: string
}


export interface MessageResponseModel {
  messages: Message[]
}
