// Credits
// https://github.com/sindresorhus/is-docker

const fs = require('fs');

let isDockerCached;

function hasDockerEnv() {
	try {
		fs.statSync('/.dockerenv');
		return true;
	} catch {
		return false;
	}
}

function hasDockerCGroup() {
	try {
		return fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker');
	} catch {
		return false;
	}
}

// TODO: Change the current implementation
// const isDocker = require('./isDocker')();
module.exports = function isDocker() {
	if (isDockerCached === undefined) {
		isDockerCached = hasDockerEnv() || hasDockerCGroup();
	}
	return isDockerCached;
};

