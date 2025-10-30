export interface PolicyConfig {
  remote_only: boolean;
  preserve_paths: string[];
  drop_if_link_missing: boolean;
  break_glass_hosts: string[];
}

export const DEFAULT_POLICY: PolicyConfig = {
  remote_only: true,
  preserve_paths: ['/media/preserve/'],
  drop_if_link_missing: false,
  break_glass_hosts: []
};

export interface EnvironmentConfig {
  REMOTE_ONLY?: string;
  PRESERVE_PATHS?: string;
  DROP_IF_LINK_MISSING?: string;
  BREAK_GLASS_HOSTS?: string;
}

export function policyFromEnvironment(env: EnvironmentConfig): PolicyConfig {
  return {
    remote_only: env.REMOTE_ONLY === '1',
    preserve_paths: env.PRESERVE_PATHS ? env.PRESERVE_PATHS.split(',').map(p => p.trim()) : DEFAULT_POLICY.preserve_paths,
    drop_if_link_missing: env.DROP_IF_LINK_MISSING === '1',
    break_glass_hosts: env.BREAK_GLASS_HOSTS ? env.BREAK_GLASS_HOSTS.split(',').map(h => h.trim()) : []
  };
}

export function validatePolicy(policy: PolicyConfig): string[] {
  const errors: string[] = [];
  
  if (typeof policy.remote_only !== 'boolean') {
    errors.push('remote_only must be a boolean');
  }
  
  if (!Array.isArray(policy.preserve_paths)) {
    errors.push('preserve_paths must be an array');
  } else if (!policy.preserve_paths.every(path => typeof path === 'string' && path.startsWith('/'))) {
    errors.push('preserve_paths must be strings starting with "/"');
  }
  
  if (typeof policy.drop_if_link_missing !== 'boolean') {
    errors.push('drop_if_link_missing must be a boolean');
  }
  
  if (!Array.isArray(policy.break_glass_hosts)) {
    errors.push('break_glass_hosts must be an array');
  }
  
  return errors;
}
