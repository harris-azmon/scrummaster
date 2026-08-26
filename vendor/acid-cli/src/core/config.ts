export interface FossilConfig {
    cwd: string;
}

export interface EnvLike {
    [key: string]: string | undefined;
}

// cli-core.CONFIG.1, cli-core.CONFIG.2
// The fossil backend is entirely local — there is no base URL or bearer
// token to resolve (that was app.acai.sh-specific). ACID_FOSSIL_CWD lets a
// caller point at a checkout other than the process cwd, e.g. for tests.
export function resolveFossilConfig(
    env: EnvLike = process.env,
    cwd: string = process.cwd(),
): FossilConfig {
    return { cwd: env.ACID_FOSSIL_CWD ?? cwd };
}
