import { debug, setFailed, setOutput, warning } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { EOL } from 'os';
import { Strategy } from './lib';
import Dockerfile from './lib/docker';
import { githubToken } from './lib/envs';
import Inputs from './lib/inputs';
import Package from './lib/package';
import Regex from './lib/regex';
import { debugVariables, requireAnyEnv } from './lib/setup';
import Tag from './lib/tag';

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
            setFailed(`"${strategy}" is not a recognized tagging strategy. Choose from: 'package' (package.json), 'docker' (uses Dockerfile), or 'regex' (JS-based RegExp).`);

            return null;
    }
}

function publishTagValues(tag?: Tag) {
    if (!tag) {
        setOutput('tagname', '');
        setOutput('tagsha', '');
        setOutput('taguri', '');
        setOutput('tagmessage', '');
        setOutput('tagref', '');
        setOutput('tagcreated', false);
    }
    else {
        const data = tag.values;
        setOutput('tagname', data.name);
        setOutput('tagsha', data.sha);
        setOutput('taguri', data.uri);
        setOutput('tagmessage', data.message);
        setOutput('tagref', data.ref);
        setOutput('tagcreated', true);
    }
}

async function run() {
    try {
        debugVariables();
        requireAnyEnv();

        // Configure the default output
        setOutput('tagcreated', 'no');

        const inputs = new Inputs();

        // Identify the tag parsing strategy
        const { root, regexPattern } = inputs;
        const strategy: Strategy = regexPattern.length > 0 ? 'regex' : inputs.strategy;

        const version = getVersion(strategy, root, regexPattern);

        const msg = `using the ${strategy} extraction ${strategy === 'regex' ? `with the /${regexPattern}/gim pattern.` : ''}.`;

        if (!version) {
            throw new Error(`No version identified ${msg}`);
        }

        warning(`Recognized "${version}" ${msg}`);
        setOutput('version', version);
        debug(` Detected version ${version}`);

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

        warning(`Attempting to create ${tag.name} tag.`);
        setOutput('tagrequested', tag.name);
        setOutput('prerelease', tag.prerelease ? true : false);
        setOutput('build', tag.build ? true : false);

        // Check for existance of tag and abort (short circuit) if it already exists.
        if (await tag.exists()) {
            warning(`"${tag.name}" tag already exists.` + EOL);
            setOutput('tagname', '');
            return;
        }

        await tag.push();

        publishTagValues(tag);
    } catch (error) {
        publishTagValues();
        setFailed(error as Error);
    }
}


run();
