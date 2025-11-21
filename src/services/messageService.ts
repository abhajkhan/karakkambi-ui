import axios, { type AxiosResponse } from "axios";
import type { MessageResponseModel } from "../types/index";

// export const GET_MESSAGE_ENDPOINT = "http://localhost:4000/api/messages"

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL;
const API_BASE_URL = SOCKET_SERVER_URL + '/api';

export const get_messages = async () => {
    const response: AxiosResponse<MessageResponseModel[]> = await axios.get(`${API_BASE_URL}/messages`);
    console.log(response.data);
    return response.data;
}