import { Octokit } from '@octokit/core';

declare const GitHubUnion: typeof Octokit &
    import('@octokit/core/dist-types/types').Constructor<
    import('@octokit/plugin-rest-endpoint-methods/dist-types/types').Api & {
        paginate: import('@octokit/plugin-paginate-rest').PaginateInterface;
    }
    >;

export type GitHub = InstanceType<typeof GitHubUnion>;

export type repo = {
    owner: string;
    repo: string;
}

export type Strategy = 'docker'|'package'|'regex';
