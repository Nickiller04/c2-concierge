import { createHash } from 'crypto';

export async function probeLinkResolution(
  assetUrl: string,
  expectedManifestHash?: string
): Promise<{
  manifest_url?: string;
  manifest_fetch_status: number;
  hash_alignment: boolean;
  html_link_fallback: boolean;
}> {
  // First, try to get manifest from Link header
  const headResponse = await fetch(assetUrl, { method: 'HEAD' });
  const linkHeader = headResponse.headers.get('link');
  
  let manifestUrl: string | undefined;
  
  if (linkHeader) {
    const match = linkHeader.match(/<([^>]+)>;\s*rel="c2pa-manifest"/);
    if (match) {
      manifestUrl = match[1];
    }
  }

  // If no Link header, try HTML fallback
  let html_link_fallback = false;
  if (!manifestUrl) {
    try {
      const response = await fetch(assetUrl);
      const html = await response.text();
      
      // Look for <link rel="c2pa-manifest" href="...">
      const linkMatch = html.match(/<link[^>]+rel="c2pa-manifest"[^>]+href="([^"]+)"/);
      if (linkMatch) {
        manifestUrl = linkMatch[1];
        html_link_fallback = true;
      }
    } catch (error) {
      console.warn('HTML fallback failed:', error);
    }
  }

  if (!manifestUrl) {
    return {
      manifest_fetch_status: 0,
      hash_alignment: false,
      html_link_fallback
    };
  }

  // Try to fetch the manifest
  try {
    const manifestResponse = await fetch(manifestUrl);
    const manifestStatus = manifestResponse.status;
    
    if (!manifestResponse.ok) {
      return {
        manifest_url: manifestUrl,
        manifest_fetch_status: manifestStatus,
        hash_alignment: false,
        html_link_fallback
      };
    }

    // Check hash alignment if expected hash provided
    let hash_alignment = false;
    if (expectedManifestHash) {
      const manifestBytes = new Uint8Array(await manifestResponse.arrayBuffer());
      const actualHash = createHash('sha256').update(manifestBytes).digest('hex');
      hash_alignment = actualHash === expectedManifestHash.toLowerCase();
    } else {
      // If no expected hash, assume alignment for Phase 0
      hash_alignment = true;
    }

    return {
      manifest_url: manifestUrl,
      manifest_fetch_status: manifestStatus,
      hash_alignment,
      html_link_fallback
    };
  } catch (error) {
    return {
      manifest_url: manifestUrl,
      manifest_fetch_status: -1,
      hash_alignment: false,
      html_link_fallback
    };
  }
}
