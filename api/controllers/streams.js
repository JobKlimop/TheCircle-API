const sha = require('sha256');
const _ = require('lodash');

function getStreams(req, res, next) {
  let stats = {};

  this.sessions.forEach(function (session, id) {
    if (session.isStarting) {
      let regRes = /\/(.*)\/(.*)/gi.exec(session.publishStreamPath || session.playStreamPath);

      if (regRes === null) return;

      let [app, stream] = _.slice(regRes, 1);
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

  res.json(stats);
}

function getStream(req, res, next) {

  let streamStats = {
    isLive: false,
    viewers: 0,
    duration: 0,
    bitrate: 0,
    startTime: null
  };

  let publishStreamPath = `/${req.params.app}/${req.params.stream}`;

  let publisherSession = this.sessions.get(this.publishers.get(publishStreamPath));

  streamStats.isLive = !!publisherSession;
  streamStats.viewers = _.filter(Array.from(this.sessions.values()), (session) => {
    return session.playStreamPath === publishStreamPath;
  }).length;
  streamStats.duration = streamStats.isLive ? Math.ceil((Date.now() - publisherSession.startTimestamp) / 1000) : 0;
  streamStats.bitrate = streamStats.duration > 0 ? Math.ceil(_.get(publisherSession, ['socket', 'bytesRead'], 0) * 8 / streamStats.duration / 1024) : 0;
  streamStats.startTime = streamStats.isLive ? publisherSession.connectTime : null;

  res.json(streamStats);
}

function getEncryptedHash(req, res, next) {
	console.log(req.body);

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
		let equal = compareHash(hash);
		if (equal) {
			console.log('it is equal');
			response.equal = true;
			res.status(200).json(response);
		} else {
			console.log('it is not equal');
			response.equal = false;
			res.status(200).json(response);
		}
	} else {
		res.json('No publishers');
	}

}

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

exports.getStreams = getStreams;
exports.getStream = getStream;
exports.getEncryptedHash = getEncryptedHash;
