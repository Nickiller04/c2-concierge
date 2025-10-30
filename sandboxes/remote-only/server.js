#!/usr/bin/env node

import express from 'express';
import sharp from 'sharp';
import cors from 'cors';
import { createServer } from 'http';

const PORT = process.env.PORT || 4103;
const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', sandbox: 'remote-only', port: PORT });
});

// Serve assets with remote-only policy
app.get('/assets/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Create a clean image without any embedded claims
    const imageBuffer = await sharp({
      create: {
        width: 150,
        height: 150,
        channels: 4,
        background: { r: 0, g: 0, b: 255, alpha: 1 }
      }
    })
    .jpeg({ quality: 85 })
    .toBuffer();

    // Add manifest hash header
    const manifestHash = 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678';
    res.set('X-Manifest-Hash', manifestHash);
    res.set('X-C2-Policy', 'remote-only');
    
    // CSP headers to block embed extraction
    res.set('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; frame-ancestors 'none'");
    res.set('X-Content-Type-Options', 'nosniff');
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
    
    // Return a remote-only manifest
    const manifest = {
      '@context': ['https://w3id.org/c2pa/1.0'],
      claim: {
        signature: 'remote-only-signature',
        assertion_data: {
          'c2pa.assertions': [
            {
              'label': 'c2pa.actions',
              'data': {
                'actions': [
                  {
                    'action': 'c2pa.created',
                    'when': '2025-10-30T14:00:00Z',
                    'softwareAgent': 'C2-Concierge-Remote-Only'
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

// Block attempts to access embedded content
app.get('/embed/:filename', (req, res) => {
  res.status(403).json({
    error: 'Embedded content access blocked by remote-only policy',
    policy: 'remote-only'
  });
});

const server = createServer(app);
server.listen(PORT, () => {
  console.log(`Remote-only sandbox running on port ${PORT}`);
  console.log(`Health check: http://127.0.0.1:${PORT}/health`);
});
