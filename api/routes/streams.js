const express = require('express');
const streamController = require('../controllers/streams');

module.exports = (context) => {
  let router = express.Router();
  router.get('/', streamController.getStreams.bind(context));
  router.get('/:app/:stream', streamController.getStream.bind(context));
  router.post('/:app/:stream', streamController.getEncryptedHash.bind(context));
  return router;
};
