const hashChecker = require('../../hash_checker');
const _ = require('lodash');
const request = require('request');

function getStreams(req, res, next) {
  let stats = {};

  this.sessions.forEach(function (session, id) {
  	if (session.isStarting) {
  		let regRes = /\/(.*)\/(.*)/gi.exec(session.publishStreamPath || session.playStreamPath);
  		if (regRes === null) return;

  		let [app, stream] = _.slice(regRes, 1);

  		if (!_.get(stats, [app, stream])) {
  			_.set(stats, [app, stream], {
  				publisher: null,
				subscribers: []
			});
  		}

  		switch (true) {
  			case session.isPublishing: {
  				_.set(stats, [app, stream, 'publisher'], {
  					app: app,
					stream: stream,
					clientId: session.id,
					connectCreated: session.connectTime,
					bytes: session.socket.bytesRead,
					ip: session.socket.remoteAddress,
					audio: session.audioCodec > 0 ? {
  						codec: session.audioCodecName,
						profile: session.audioProfileName,
						samplerate: session.audioSamplerate,
						channels: session.audioChannels
					} : null,
					video: session.videoCodec > 0 ? {
  						codec: session.videoCodecName,
						width: session.videoWidth,
						height: session.videoHeight,
						profile: session.videoProfileName,
						level: session.videoLevel,
						fps: session.videoFps
					} : null,
				});
  				break;
  			}
  			case !!session.playStreamPath: {
				switch (session.constructor.name) {
					case 'NodeRtmpSession': {
						stats[app][stream]['subscribers'].push({
							app: app,
							stream: stream,
							clientId: session.id,
							connectCreated: session.connectTime,
							bytes: session.socket.bytesWritten,
							ip: session.socket.remoteAddress,
							protocol: 'rtmp'
						});
						break;
					}
					case 'NodeFlvSession': {
						stats[app][stream]['subscribers'].push({
							app: app,
							stream: stream,
							clientId: session.id,
							connectCreated: session.connectTime,
							bytes: session.req.connection.bytesWritten,
							ip: session.req.connection.remoteAddress,
							protocol: session.TAG === 'websocket-flv' ? 'ws' : 'http'
						});
						break;
					}
				}
				break;
  			}
  		}
  	}
  });
  res.json({Stats: stats});
}

function getStream(req, res, next) {

  let publishStreamPath = `/${req.params.app}/${req.params.stream}`;
  let publisherName = req.params.stream;


	let streamStats = {
		isLive: false,
		viewers: 0,
		duration: 0,
		bitrate: 0,
		startTime: null
	};

	  let publisherSession = this.sessions.get(this.publishers.get(publishStreamPath));

	  if (!!publisherSession === false) {
		  console.log(publisherSession);

		  streamStats.isLive = !!publisherSession;
		  streamStats.viewers = _.filter(Array.from(this.sessions.values()), (session) => {
			  return session.playStreamPath === publishStreamPath;
		  }).length;
		  streamStats.duration = streamStats.isLive ? Math.ceil((Date.now() - publisherSession.startTimestamp) / 1000) : 0;
		  streamStats.bitrate = streamStats.duration > 0 ? Math.ceil(_.get(publisherSession, ['socket', 'bytesRead'], 0) * 8 / streamStats.duration / 1024) : 0;
		  streamStats.startTime = streamStats.isLive ? publisherSession.connectTime : null;

		  res.json(streamStats);
	  } else {
	  	console.log('streamer is live');
	  	getPublisher(publisherName)
			.then(response => {
			  let streamerInfo = {
				  username : response.username,
				  email : response.email,
				  slogan : response.slogan
			  };
			  streamStats.isLive = !!publisherSession;
			  streamStats.viewers = _.filter(Array.from(this.sessions.values()), (session) => {
			  	return session.playStreamPath === publishStreamPath;
			  }).length;
			  streamStats.duration = streamStats.isLive ? Math.ceil((Date.now() - publisherSession.startTimestamp) / 1000) : 0;
			  streamStats.bitrate = streamStats.duration > 0 ? Math.ceil(_.get(publisherSession, ['socket', 'bytesRead'], 0) * 8 / streamStats.duration / 1024) : 0;
			  streamStats.startTime = streamStats.isLive ? publisherSession.connectTime : null;
			  streamStats.userinfo = streamerInfo;
			  res.json(streamStats);
			})
			.catch(error => res.status(400).json(error));
	  }
}

function getEncryptedHash(req, res, next) {
	console.log({ RequestBody: req.body});

	let stats = {};
	let app = '';
	let stream = '';

	// let publishStreamPath = `/${req.params.app}/${req.params.stream}`;
	// console.log(publishStreamPath);

	let publishLive = req.params.app;
	let publishStream = req.params.stream;

	this.sessions.forEach(function (session, id) {
		if (session.isStarting) {
			let regRes = /\/(.*)\/(.*)/gi.exec(session.publishStreamPath || session.playStreamPath);

			if (regRes === null) return;

			[app, stream] = _.slice(regRes, 1);
			// let [app, stream] = _.slice(regRes, 1);
			// console.log(app, stream);

			if (!_.get(stats, [app, stream])) {
				_.set(stats, [app, stream], {
					publisher: null,
					subscribers: []
				});
			}

			switch (true) {
				case session.isPublishing: {
					_.set(stats, [app, stream, 'publisher'], {
						app: app,
						stream: stream,
						clientId: session.id,
						connectCreated: session.connectTime,
						bytes: session.socket.bytesRead,
						ip: session.socket.remoteAddress,
						audio: session.audioCodec > 0 ? {
							codec: session.audioCodecName,
							profile: session.audioProfileName,
							samplerate: session.audioSamplerate,
							channels: session.audioChannels
						} : null,
						video: session.videoCodec > 0 ? {
							codec: session.videoCodecName,
							width: session.videoWidth,
							height: session.videoHeight,
							profile: session.videoProfileName,
							level: session.videoLevel,
							fps: session.videoFps
						} : null,
					});

					break;
				}
				case !!session.playStreamPath: {
					switch (session.constructor.name) {
						case 'NodeRtmpSession': {
							stats[app][stream]['subscribers'].push({
								app: app,
								stream: stream,
								clientId: session.id,
								connectCreated: session.connectTime,
								bytes: session.socket.bytesWritten,
								ip: session.socket.remoteAddress,
								protocol: 'rtmp'
							});

							break;
						}
						case 'NodeFlvSession': {
							stats[app][stream]['subscribers'].push({
								app: app,
								stream: stream,
								clientId: session.id,
								connectCreated: session.connectTime,
								bytes: session.req.connection.bytesWritten,
								ip: session.req.connection.remoteAddress,
								protocol: session.TAG === 'websocket-flv' ? 'ws' : 'http'
							});

							break;
						}
					}

					break;
				}
			}
		}
	});

	if (app == '' && stream == '') {
		console.log('no stream available');
	}

	if (publishLive === app && publishStream === stream) {
		console.log({
			path: app,
			name: stream
		});
		let body = req.body;

		if (req.body === undefined) {
			console.log('undefined');
			body = 'undefined';
		}

		let hash = req.body.hash;

		let response = {
			apipoint: 'getEncryptedHash',
			path: app,
			streamName: stream,
			hash: hash
		};
		let equal = hashChecker.compareHash(hash);
		if (equal) {
			console.log('it is equal');
			response.equal = true;
			res.status(200).json(response);
			next();
		} else {
			console.log('it is not equal');
			response.equal = false;
			res.status(200).json(response);
			next();
		}
	} else {
		res.json('No publishers');
		next();
	}
}

function getPublisher(streamerName) {
	return new Promise(function (resolve, reject) {
		var url = 'http://localhost:3000/api/account/user/' + streamerName;
		request(url, {json: true}, function(error, response, body) {
			console.log(body);
			if (error) {
				reject(error);
			}
			if (response) {
				let publishers = response.body;
				console.log(publishers);
				resolve(publishers);
			}
		});
	});
}

exports.getStreams = getStreams;
exports.getStream = getStream;
exports.getEncryptedHash = getEncryptedHash;
