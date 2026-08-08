import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

/**
 * Makes a schema's virtuals survive `.lean()` and serialisation.
 *
 * Mongoose accepts `.lean({ virtuals: true })` and then silently ignores it:
 * the option does nothing without this plugin, so every virtual reads as
 * `undefined` on a lean document. Nothing warns, and the call site looks
 * exactly like working code — which is how fourteen read paths across eight
 * controllers ended up shipping with `acceptanceRate`, `isOpen`,
 * `shortlistCount`, `primaryContact` and the rest quietly missing.
 *
 * Applied per schema rather than as a global `mongoose.plugin()` call,
 * because a global one only reaches schemas compiled after it runs — which
 * makes correctness depend on module import order, and that is not a thing
 * anyone should have to reason about to read a count off a page.
 */
export function withVirtuals(schema) {
  schema.plugin(mongooseLeanVirtuals);
  schema.set('toJSON', { virtuals: true });
  schema.set('toObject', { virtuals: true });
  return schema;
}
