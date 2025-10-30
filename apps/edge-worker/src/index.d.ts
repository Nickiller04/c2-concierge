interface Env {
    REMOTE_ONLY?: string;
    PRESERVE_PATHS?: string;
    MANIFEST_BASE?: string;
    BREAK_GLASS_KV?: KVNamespace;
    HMAC_SECRET?: string;
}
declare const _default: {
    fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response>;
};
export default _default;
//# sourceMappingURL=index.d.ts.map