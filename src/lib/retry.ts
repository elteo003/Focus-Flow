interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  retryCondition?: (error: any) => boolean;
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
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if condition is not met
      if (!opts.retryCondition(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Calculate delay
      const delay = opts.backoff === 'exponential'
        ? opts.delay * Math.pow(2, attempt)
        : opts.delay * (attempt + 1);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Retry condition for network errors
export const isRetryableError = (error: any): boolean => {
  // Network errors
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('network')) {
    return true;
  }

  // Timeout errors
  if (error?.code === 'TIMEOUT' || error?.message?.includes('timeout')) {
    return true;
  }

  // 5xx server errors
  if (error?.status >= 500 && error?.status < 600) {
    return true;
  }

  // Rate limiting (429)
  if (error?.status === 429) {
    return true;
  }

  return false;
};

