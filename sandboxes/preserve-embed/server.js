#!/usr/bin/env node

import express from 'express';
import sharp from 'sharp';
import cors from 'cors';
import { createServer } from 'http';

const PORT = process.env.PORT || 4102;
const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', sandbox: 'preserve-embed', port: PORT });
});

// Serve assets without stripping (preserve embeds)
app.get('/assets/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Create a test image that preserves metadata (simulating embedded C2PA)
    let imageBuffer: Buffer;
    
    // For Phase 0, create an image with metadata that would preserve embeds
    imageBuffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 1 }
      }
    })
    .jpeg({ quality: 95 })
    .withMetadata({
      exif: {
        IFD0: {
          Software: 'C2-Concierge-Preserve-Embed',
          Copyright: 'Test embedded C2PA claim'
        }
      }
    })
    .toBuffer();

    // Add manifest hash header
    const manifestHash = 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567';
    res.set('X-Manifest-Hash', manifestHash);
    res.set('X-C2-Policy', 'preserve-allowed');
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Content-Type', 'image/jpeg');
    
    res.send(imageBuffer);
  } catch (error) {
    console.error('Error serving asset:', error);
    res.status(500).json({ error: 'Failed to process asset' });
  }
});

// Serve manifests (static)
app.get('/manifests/:hash.c2pa', (req, res) => {
  try {
    const { hash } = req.params;
    
    // Return a manifest that would match embedded claims
    const manifest = {
      '@context': ['https://w3id.org/c2pa/1.0'],
      claim: {
        signature: 'preserve-embed-signature',
        assertion_data: {
          'c2pa.assertions': [
            {
              'label': 'c2pa.actions',
              'data': {
                'actions': [
                  {
                    'action': 'c2pa.created',
                    'when': '2025-10-30T14:00:00Z',
                    'softwareAgent': 'C2-Concierge-Preserve-Embed'
                  }
                ]
              }
            }
          ]
        }
      }
    };
    
    res.set('Content-Type', 'application/c2pa');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('Content-Disposition', `inline; filename="${hash}.c2pa"`);
    
    res.json(manifest);
  } catch (error) {
    console.error('Error serving manifest:', error);
    res.status(500).json({ error: 'Failed to serve manifest' });
  }
});

// HTML fallback with link tag
app.get('/assets-with-fallback/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const manifestHash = 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567';
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>C2 Concierge Asset</title>
  <link rel="c2pa-manifest" href="/manifests/${manifestHash}.c2pa">
</head>
<body>
  <h1>Asset: ${filename}</h1>
  <p>This asset includes C2PA provenance information.</p>
</body>
</html>`;
    
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error serving HTML fallback:', error);
    res.status(500).json({ error: 'Failed to serve HTML fallback' });
  }
});

const server = createServer(app);
server.listen(PORT, () => {
  console.log(`Preserve-embed sandbox running on port ${PORT}`);
  console.log(`Health check: http://127.0.0.1:${PORT}/health`);
});
