const sha = require('sha256');

// Comparing encrypted hash and calculate hash from data

 function compareHash(pk_hash) {
	let test = '123456';
	let hash = sha(test);
	let pkHash = sha(pk_hash);

	console.log({Received: hash});
	console.log({Calculated: pkHash});

	if (hash === pkHash) {
		return true;
	} else {
		return false;
	}
}

exports.compareHash = compareHash;