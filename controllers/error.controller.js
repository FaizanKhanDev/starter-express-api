const catchError = (callback) => async (req, res, next) => {
  try {
    await callback(req, res, next);
  } catch (e) {
    console.error('internal error:', e);

    return res.status(500).send({
      status: false,
      error: 'internal_server_error',
    });
  }
};

module.exports = {
  catchError,
};
