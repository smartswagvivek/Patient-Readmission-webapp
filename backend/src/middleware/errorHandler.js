export function errorHandler(logger) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    logger.error({ err }, "Unhandled error");

    if (res.headersSent) {
      return;
    }

    const status = err.status || 500;
    const validationMessage =
      status === 400 &&
      Array.isArray(err.details) &&
      err.details.length > 0 &&
      err.details[0]?.msg
        ? String(err.details[0].msg)
        : null;
    const message =
      status === 500
        ? "Internal server error"
        : validationMessage || err.message || "Error";

    const payload = {
      error: {
        message,
      },
    };

    if (status === 400 && Array.isArray(err.details)) {
      payload.error.details = err.details;
    }

    res.status(status).json(payload);
  };
}

