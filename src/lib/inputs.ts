import { getInput } from "@actions/core";
import { Strategy } from ".";

export interface TagData {
    prefix: string;
    suffix: string;
    message: string;
}

export default class Inputs {
    get root() {
        return getInput('root', { required: false }) || './';
    }

    get regexPattern() {
        return getInput('regex_pattern', { required: false }) || '';
    }

    get strategy(): Strategy {
        return getInput('strategy', { required: false }).toLowerCase() as Strategy || 'package';
    }

    get tagPrefix(): string {
        return getInput('tag_prefix', { required: false });
    }

    get tag(): TagData {
        return {
            prefix: getInput('tag_prefix', { required: false }),
            suffix: getInput('tag_suffix', { required: false }),
            message: getInput('tag_message', { required: false }),
        }
    }
}
