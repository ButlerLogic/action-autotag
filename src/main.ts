import * as core from '@actions/core';
import { EOL } from 'os';
import Setup from './lib/setup';
import Package from './lib/package';
import Tag from './lib/tag';
import Regex from './lib/regex';
import Dockerfile from './lib/docker';
import { context, getOctokit } from '@actions/github';
import { githubToken } from './lib/envs';
import { Strategy } from './lib';
import Inputs from './lib/inputs';

function getVersion(strategy: Strategy, root: string, regexPattern?: string) {

    switch (strategy) {
        case 'docker':
            return (new Dockerfile(root)).version;

        case 'package':
            // Extract using the package strategy (this is the default strategy)
            return (new Package(root)).version;

        case 'regex':
            if (!regexPattern) {
                throw new Error("Can not select 'regex' strategy if no 'regex_pattern' variable has been provided.");
            }
            return (new Regex(root, new RegExp(regexPattern, 'gim'))).version;

        default:
            core.setFailed(`"${strategy}" is not a recognized tagging strategy. Choose from: 'package' (package.json), 'docker' (uses Dockerfile), or 'regex' (JS-based RegExp).`);

            return null;
    }
}

function publishTagValues(tag?: Tag) {
    if (!tag) {
        core.setOutput('tagname', '');
        core.setOutput('tagsha', '');
        core.setOutput('taguri', '');
        core.setOutput('tagmessage', '');
        core.setOutput('tagref', '');
        core.setOutput('tagcreated', false);
    }
    else {
        const data = tag.values;
        core.setOutput('tagname', data.name);
        core.setOutput('tagsha', data.sha);
        core.setOutput('taguri', data.uri);
        core.setOutput('tagmessage', data.message);
        core.setOutput('tagref', data.ref);
        core.setOutput('tagcreated', true);
    }
}

async function run() {
    try {
        Setup.debug();
        Setup.requireAnyEnv();

        // Configure the default output
        core.setOutput('tagcreated', 'no');

        const inputs = new Inputs();

        // Identify the tag parsing strategy
        const { root, regexPattern } = inputs;
        const strategy: Strategy = regexPattern.length > 0 ? 'regex' : inputs.strategy;

        const version = getVersion(strategy, root, regexPattern);

        const msg = `using the ${strategy} extraction ${strategy === 'regex' ? `with the /${regexPattern}/gim pattern.` : ''}.`;

        if (!version) {
            throw new Error(`No version identified ${msg}`);
        }

        core.warning(`Recognized "${version}" ${msg}`);
        core.setOutput('version', version);
        core.debug(` Detected version ${version}`);

        const github = getOctokit(githubToken());
        const repo = context.repo;

        const tagData = inputs.tag;

        // Configure a tag using the identified version
        const tag = new Tag(
            github,
            repo,
            version,
            tagData
        );

        core.warning(`Attempting to create ${tag.name} tag.`);
        core.setOutput('tagrequested', tag.name);
        core.setOutput('prerelease', tag.prerelease ? true : false);
        core.setOutput('build', tag.build ? true : false);

        // Check for existance of tag and abort (short circuit) if it already exists.
        if (await tag.exists()) {
            core.warning(`"${tag.name}" tag already exists.` + EOL);
            core.setOutput('tagname', '');
            return;
        }

        await tag.push();

        publishTagValues(tag);
    } catch (error) {
        publishTagValues();
        core.setFailed(error as Error);
    }
}


run();
