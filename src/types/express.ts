export interface ApiResponseSuccess<T = any> {
  success: true;
  data: T;
}

export interface ApiResponseFailed<T = any> {
  success: false;
  message: string;
  error?: string;
}

export type ApiResponse<T = any> = ApiResponseSuccess | ApiResponseFailed;
