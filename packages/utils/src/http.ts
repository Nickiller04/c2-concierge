export interface HttpHeaders {
  [key: string]: string;
}

export function normalizeHeaders(headers: Headers | Record<string, string>): HttpHeaders {
  const normalized: HttpHeaders = {};
  
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      normalized[key.toLowerCase()] = value;
    });
  } else {
    Object.entries(headers).forEach(([key, value]) => {
      normalized[key.toLowerCase()] = value;
    });
  }
  
  return normalized;
}

export function extractLinkHeader(headers: HttpHeaders): string | null {
  const linkHeader = headers['link'];
  if (!linkHeader) return null;
  
  const match = linkHeader.match(/<([^>]+)>;\s*rel="c2pa-manifest"/);
  return match ? match[1] : null;
}

export function createCacheHeaders(immutable: boolean = true): HttpHeaders {
  if (immutable) {
    return {
      'cache-control': 'public, max-age=31536000, immutable'
    };
  }
  
  return {
    'cache-control': 'public, max-age=3600'
  };
}
