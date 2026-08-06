/**
 * Validates `req[source]` against a Zod schema and replaces it with the parsed
 * result, so handlers always receive coerced, trusted data.
 */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return next(result.error);
  }
  // req.query/req.params are getters on some Express versions — assign fields.
  if (source === 'body') {
    req.body = result.data;
  } else {
    req.validated = { ...(req.validated || {}), [source]: result.data };
  }
  return next();
};

/** Reads validated query/params written by `validate`, falling back to raw. */
export const validated = (req, source) => req.validated?.[source] ?? req[source];
