export interface GeminiGenerateRequest {
  prompt: string;
}

export interface GeminiGenerateSuccessResponse {
  text: string;
}

export interface GeminiGenerateErrorResponse {
  error: string;
}

export type GeminiGenerateResponse =
  | GeminiGenerateSuccessResponse
  | GeminiGenerateErrorResponse;
