export interface Message {
  id: string;
  username: string;
  text: string;
  imageUrl?: string;
  stickerUrl?: string;
  voiceUrl?: string;
  createdAt: string;
}


export interface MessageResponseModel {
  messages: ResponseMessageItem[]
}

export interface ResponseMessageItem {
  id: string,
  username: string,
  text: string,
  createdAt: string,
}