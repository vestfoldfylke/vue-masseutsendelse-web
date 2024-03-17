export default class AppError extends Error {
  constructor (title, message, errors) {
    super()
    this.title = title
    this.message = message
    if (errors && Array.isArray(errors) && errors.length > 0) this.errors = errors
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}
