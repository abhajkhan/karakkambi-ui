export interface MessagePayload {
  text?: string
  imageUrl?: string
  stickerUrl?: string
  voiceUrl?: string
  voiceDuration?: number
  voiceSize?: number
  cloudinaryPublicId?: string
  replyTo?: string | null
}

export interface Message extends MessagePayload {
  id: string
  createdAt: string
}


export interface MessageResponseModel {
  messages: Message[]
}
