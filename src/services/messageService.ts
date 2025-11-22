import axios, { type AxiosResponse } from "axios";
import type { ResponseMessageItem } from "../types/index";

// export const GET_MESSAGE_ENDPOINT = "http://localhost:4000/api/messages"

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL;
const API_BASE_URL = SOCKET_SERVER_URL + '/api';

export const get_messages = async (cursor?: string): Promise<ResponseMessageItem[]> => {
    const params = cursor ? { cursor } : {};
    const response: AxiosResponse<{ messages: ResponseMessageItem[], pagination: any }> = await axios.get(`${API_BASE_URL}/messages`, { params });
    console.log(response.data.messages);
    return response.data.messages;
}