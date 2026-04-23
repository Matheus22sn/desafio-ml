import axios from 'axios';

const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = configuredBaseUrl
  ? configuredBaseUrl.replace(/\/$/, '')
  : 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
});

export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const responseMessage =
      typeof error.response?.data?.error === 'string' ? error.response.data.error : undefined;

    return responseMessage || error.message || 'Unexpected request error.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected request error.';
};
