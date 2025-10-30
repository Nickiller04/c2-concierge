export async function probeHeaders(assetUrl: string): Promise<{
  headers: Record<string, string>;
  link_header_present: boolean;
  x_c2_policy?: string;
  content_type: string;
  cache_control?: string;
}> {
  const response = await fetch(assetUrl, { method: 'HEAD' });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch headers: ${response.status} ${response.statusText}`);
  }

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const linkHeader = headers['link'] || '';
  const link_header_present = linkHeader.includes('rel="c2pa-manifest"');

  return {
    headers,
    link_header_present,
    x_c2_policy: headers['x-c2-policy'],
    content_type: headers['content-type'] || '',
    cache_control: headers['cache-control']
  };
}
