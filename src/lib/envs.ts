class MissingEnvVariableError extends Error {
    public constructor(envName: string) {
        super(`Missing environment variable: ${envName}`);
    }
}

const workspace = () => {

    const workspaceEnv = process.env.GITHUB_WORKSPACE;
    if (!workspaceEnv) {
        throw new MissingEnvVariableError("GITHUB_WORKSPACE");
    }

    return workspaceEnv;
};

const githubSha = () => {
    const sha = process.env.GITHUB_SHA;
    if (!sha) {
        throw new MissingEnvVariableError("GITHUB_SHA");
    }

    return sha;
};

const githubToken = () => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        throw new MissingEnvVariableError("GITHUB_TOKEN");
    }

    return token;
};

const headBranch = () => {
    const head = process.env.HEAD_BRANCH ?? "master";
    return head;
};

export { workspace, githubSha, githubToken, headBranch };
