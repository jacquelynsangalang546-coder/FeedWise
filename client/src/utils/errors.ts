import { isAxiosError } from 'axios';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { ApiErrorBody } from '../types';

// Turns any thrown error into a sentence a user can act on.
export function getErrorMessage(error: unknown): string {
  if (isAxiosError<ApiErrorBody>(error)) {
    if (error.response?.data?.message) return error.response.data.message;
    if (error.code === 'ECONNABORTED') return 'The server took too long to respond. Try again.';
    if (!error.response) return 'Cannot reach the FeedWise API. Check that the server is running.';
    return `Request failed with status ${error.response.status}`;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export function getErrorStatus(error: unknown) {
  return isAxiosError(error) ? error.response?.status : undefined;
}

export function getErrorBody(error: unknown): ApiErrorBody | undefined {
  return isAxiosError<ApiErrorBody>(error) ? error.response?.data : undefined;
}

/**
 * Copies server-side field errors ({ errors: { sku: "..." } }) onto the form,
 * so they appear under the right input. Returns true if any were applied.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[]
): boolean {
  const errors = getErrorBody(error)?.errors;
  if (!errors) return false;
  let applied = false;
  for (const [field, message] of Object.entries(errors)) {
    if (fields.includes(field)) {
      setError(field as Path<T>, { type: 'server', message });
      applied = true;
    }
  }
  return applied;
}
