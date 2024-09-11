import { spawnSync, SpawnSyncOptions } from 'child_process';
import { mkdirSync, readFileSync, renameSync } from 'fs';
import { rimrafSync } from 'rimraf';
import * as path from 'path';
import { writeFileSync } from 'node:fs';
import * as core from '@actions/core';

const cwd = './.package';
const packageJsonPath = path.join(cwd, 'package.json');

const runCommand = (cmd: string, options?: SpawnSyncOptions) => {
	const [command, ...args] = cmd.split(' ');
	core.startGroup(`Running command: ${command} ${args.join(' ')}`);

	const result = spawnSync(command, args, { cwd, stdio: 'inherit', ...options });

	if (result.status !== 0) {
		core.error(`Command failed: ${cmd}`);
		core.endGroup();
		throw new Error(`Command failed: ${cmd}`);
	}

	core.endGroup();
	return result;
};

function isPublished(packageName: string, version: string): boolean {
		const result = spawnSync('npm', ['view', `${packageName}@${version}`], { stdio: 'pipe' });

		if (result.status !== 0) {
			const stderr = result.stderr?.toString() || '';
			if (stderr.includes('E404')) {
				return false;
			}

			throw new Error(`Command failed: ${stderr}`);
		}

		return true;
}

async function republish() {
	rimrafSync(cwd);
	mkdirSync(cwd, { recursive: true });

	core.info('Cloning repo...');
	runCommand(`git clone https://github.com/sindresorhus/ky.git .`);

	renameSync(path.join(cwd, 'source'), path.join(cwd, 'src'))
	rimrafSync(path.join(cwd, 'tsconfig.json'));

	let pkgJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
	pkgJson = {
		name: '@smeijer/ky',
		version: `${pkgJson.version}`,
		description: pkgJson.description,
		license: 'MIT',
		repository: {
			"type": "git",
			"url": "git+https://github.com/smeijer/ky.git"
		},
		funding: "https://github.com/smeijer/ky?sponsor=1",
		author: {
			name: "Stephan Meijer",
			email: "stephan.meijer@gmail.com",
		},
		type: "module",
		sideEffects: pkgJson.sideEffects,
		engines: pkgJson.engines,
		files: ["dist"],
		keywords: pkgJson.keywords,
		dependencies: pkgJson.dependencies,
		devDependencies: pkgJson.devDependencies,
		peerDependencies: pkgJson.peerDependencies,
		tshy: {
			exports: {
				"./package.json": "./package.json",
				".": "./src/index.ts"
			}
		}
	}

	writeFileSync(packageJsonPath, JSON.stringify(pkgJson, null, 2), 'utf-8');

	if (isPublished(pkgJson.name, pkgJson.version)) {
		core.info(`Done, ${pkgJson.name}@${pkgJson.version} is already published`);
		return;
	}

	let readme = readFileSync(path.join(cwd, 'readme.md'), 'utf-8');
	readme = `> This is a fork of ky to add common-js support. See [smeijer/ky](https://github.com/smeijer/ky) for the code that builds this package, or [sindresorhus/ky](https://github.com/sindresorhus/ky) for the original source.

${readme}`;

	writeFileSync(path.join(cwd, 'readme.md'), readme, 'utf-8');

	runCommand('npm install');
	runCommand('../node_modules/.bin/tshy');
	runCommand('../node_modules/.bin/attw -P');
	runCommand(`npm config set //registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}`);
	runCommand('npm publish');

	core.info(`Done, published ${pkgJson.name}@${pkgJson.version}`);
}

republish().catch((err) => {
	console.error(err);
	process.exit(1);
});
