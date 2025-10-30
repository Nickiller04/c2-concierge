import sharp from 'sharp';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function magickTransform(inputBuffer: Buffer, args: string[]): Promise<Buffer> {
  try {
    // For simple operations, use sharp for better performance
    if (args.length === 0) {
      return inputBuffer;
    }

    // Parse common operations
    if (args.includes('-strip')) {
      const image = sharp(inputBuffer);
      return await image.toBuffer(); // Remove withoutMetadata as it doesn't exist
    }

    if (args.includes('-resize')) {
      const resizeIndex = args.indexOf('-resize');
      const size = args[resizeIndex + 1];
      const image = sharp(inputBuffer);
      // Use object form to avoid TypeScript string issues
      if (size.includes('x')) {
        const [width, height] = size.split('x').map(s => s ? parseInt(s) : null);
        return await image.resize(width, height).toBuffer();
      } else if (size.includes('%')) {
        return await image.resize({ width: parseInt(size) }).toBuffer();
      } else {
        const dimension = parseInt(size);
        return await image.resize(dimension).toBuffer();
      }
    }

    if (args.includes('-quality')) {
      const qualityIndex = args.indexOf('-quality');
      const quality = parseInt(args[qualityIndex + 1]);
      const image = sharp(inputBuffer);
      return await image.jpeg({ quality }).toBuffer();
    }

    if (args.includes('webp')) {
      const image = sharp(inputBuffer);
      return await image.webp().toBuffer();
    }

    if (args.includes('avif')) {
      const image = sharp(inputBuffer);
      return await image.avif().toBuffer();
    }

    if (args.includes('-gravity') && args.includes('-crop')) {
      const gravityIndex = args.indexOf('-gravity');
      const gravity = args[gravityIndex + 1];
      const cropIndex = args.indexOf('-crop');
      const crop = args[cropIndex + 1];
      
      const image = sharp(inputBuffer);
      const metadata = await image.metadata();
      
      // Parse crop dimensions (e.g., "50%x50%")
      const [widthPercent, heightPercent] = crop.split('%').map(p => parseInt(p) / 100);
      const width = Math.floor((metadata.width || 0) * widthPercent);
      const height = Math.floor((metadata.height || 0) * heightPercent);
      
      return await image.extract({
        left: Math.floor((metadata.width || 0) - width) / 2,
        top: Math.floor((metadata.height || 0) - height) / 2,
        width,
        height
      }).toBuffer();
    }

    if (args.includes('-interlace') && args.includes('none')) {
      const image = sharp(inputBuffer);
      return await image.jpeg({ progressive: false }).toBuffer();
    }

    // Fallback to ImageMagick for complex operations
    const { stdout } = await execFileAsync('magick', [
      '-', ...args, '-'
    ], {
      encoding: null
    });
    
    return stdout;
  } catch (error) {
    throw new Error(`Magick transform failed: ${error}`);
  }
}
