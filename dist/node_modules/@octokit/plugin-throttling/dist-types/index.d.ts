import { Octokit } from "@octokit/core";
import { OctokitOptions } from "@octokit/core/dist-types/types.d";
import { ThrottlingOptions } from "./types";
export declare function throttling(octokit: Octokit, octokitOptions: OctokitOptions): {};
export declare namespace throttling {
    var VERSION: string;
    var triggersNotification: (string: string) => boolean;
}
declare module "@octokit/core/dist-types/types.d" {
    interface OctokitOptions {
        throttle?: ThrottlingOptions;
    }
}
