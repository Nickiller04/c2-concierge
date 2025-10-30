import { createServer } from 'http';
import { spawn } from 'child_process';

export interface SandboxConfig {
  name: string;
  port: number;
  type: 'strip-happy' | 'preserve-embed' | 'remote-only';
}

export const SANDBOXES: SandboxConfig[] = [
  { name: 'strip-happy', port: 4101, type: 'strip-happy' },
  { name: 'preserve-embed', port: 4102, type: 'preserve-embed' },
  { name: 'remote-only', port: 4103, type: 'remote-only' }
];

export class SandboxManager {
  private processes: Map<string, any> = new Map();

  async startAll(): Promise<void> {
    for (const sandbox of SANDBOXES) {
      await this.startSandbox(sandbox);
    }
  }

  async startSandbox(config: SandboxConfig): Promise<void> {
    const scriptPath = `../../sandboxes/${config.type}/server.js`;
    
    return new Promise((resolve, reject) => {
      const proc = spawn('node', [scriptPath], {
        stdio: 'pipe',
        env: { ...process.env, PORT: config.port.toString() }
      });

      this.processes.set(config.name, proc);

      proc.on('error', reject);
      
      // Wait for server to be ready
      setTimeout(() => {
        this.checkHealth(config.port).then(resolve).catch(reject);
      }, 1000);
    });
  }

  async stopAll(): Promise<void> {
    for (const [name, proc] of this.processes) {
      proc.kill('SIGTERM');
    }
    this.processes.clear();
  }

  private async checkHealth(port: number): Promise<void> {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    if (!response.ok) {
      throw new Error(`Sandbox on port ${port} not healthy`);
    }
  }

  getSandboxUrl(name: string): string {
    const config = SANDBOXES.find(s => s.name === name);
    if (!config) {
      throw new Error(`Unknown sandbox: ${name}`);
    }
    return `http://127.0.0.1:${config.port}`;
  }
}
