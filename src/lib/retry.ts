interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  retryCondition?: (error: unknown) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  delay: 1000,
  backoff: 'exponential',
  retryCondition: () => true,
};

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!opts.retryCondition(error)) {
        throw error;
      }

      if (attempt === opts.maxRetries) {
        break;
      }

      const delay = opts.backoff === 'exponential'
        ? opts.delay * Math.pow(2, attempt)
        : opts.delay * (attempt + 1);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

const isNetworkLikeError = (error: unknown): error is { code?: string; message?: string; status?: number } => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  return true;
};

export const isRetryableError = (error: unknown): boolean => {
  if (!isNetworkLikeError(error)) {
    return false;
  }

  if (error.code === 'NETWORK_ERROR' || error.message?.includes('network')) {
    return true;
  }

  if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
    return true;
  }

  if (typeof error.status === 'number' && error.status >= 500 && error.status < 600) {
    return true;
  }

  if (error.status === 429) {
    return true;
  }

  return false;
};

