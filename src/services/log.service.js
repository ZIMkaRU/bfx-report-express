'use strict'

const config = require('config')
const colors = require('colors')
const { createLogger, format, transports } = require('winston')
const { combine, timestamp, label, printf, splat } = format

const isDevEnv = process.env.NODE_ENV === 'development'
const isProdEnv = process.env.NODE_ENV === 'production'
const isEnable = config.has('enableLog') && config.get('enableLog')
const basePath = 'logs/'
const ext = '.log'

const logLabel = isDevEnv ? ':app-dev' : ':app'
const pathError = isEnable && (isProdEnv || isDevEnv) ? `${basePath}errors-express${ext}` : null
const pathExcLogger = isEnable && (isProdEnv || isDevEnv) ? `${basePath}exceptions-express${ext}` : null
const pathLog = isEnable && isDevEnv ? `${basePath}logs-express${ext}` : null
const enableConsole = isEnable && isDevEnv
const enableColor = isEnable && isDevEnv
const enableColorPathError = false
const enableColorPathExcLogger = false
const enableColorPathLog = false
const maxSize = null

const logConf = {
  pathError,
  pathExcLogger,
  pathLog,
  enableConsole,
  enableColor,
  enableColorPathError,
  enableColorPathExcLogger,
  enableColorPathLog,
  maxSize,
  label: logLabel
}

const loggerConfig = {
  levels: {
    error: 0,
    debug: 1,
    warn: 2,
    data: 3,
    info: 4,
    verbose: 5,
    silly: 6
  },
  colors: {
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'green',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'magenta',
    error: 'red'
  }
}

colors.setTheme(loggerConfig.colors)

const ignorePrivate = format((info, opts) => {
  if (info.private) {
    return false
  }
  return info
})

const customFormat = (opt = {}) =>
  printf(obj => {
    const level = obj.level || 'info'
    const color = opt.color || level
    const enableColor =
      typeof opt.enableColor !== 'undefined' ? opt.enableColor : true
    let res = ''

    let timestamp = obj.timestamp ? ` [${obj.timestamp}]` : ''
    let message = ''
    const _subObj = {}
    let _strObj = ''

    res += obj.level ? `${obj.level}` : ''
    res += obj.label ? `${obj.label}` : ''

    if (enableColor) res = res[color]
    if (enableColor) timestamp = timestamp.rainbow

    res += timestamp

    if (
      obj.message &&
      (typeof obj.message === 'object' || typeof obj.message === 'function')
    ) {
      message = ` message: ${JSON.stringify(obj.message)}`
    } else {
      message = obj.message ? ` message: ${obj.message}` : ''
    }
    if (enableColor) message = message[color]

    res += message
    res += res !== '' ? ' ' : ''

    for (const key of Object.keys(obj)) {
      if (
        key !== 'timestamp' &&
        key !== 'level' &&
        key !== 'label' &&
        key !== 'message' &&
        key !== 'splat'
      ) {
        if (key === 'meta') Object.assign(_subObj, obj[key])
        else _subObj[key] = obj[key]
      }
    }

    if (Object.keys(_subObj).length > 0) {
      _strObj = `\n${JSON.stringify(_subObj, undefined, 2)}`
      if (enableColor) _strObj = _strObj[color]
    }

    res += _strObj

    return res
  })

const combineFormat = (conf = {}) => {
  if (typeof conf.enableColor === 'undefined') conf.enableColor = enableColor
  if (typeof conf.label === 'undefined') conf.label = logLabel

  return combine(
    ignorePrivate(),
    splat(),
    label({ label: conf.label }),
    timestamp(),
    customFormat({ enableColor: conf.enableColor })
  )
}

const logTransports = {}
let excLogTransports = null

if (pathExcLogger) {
  excLogTransports = [
    new transports.File({
      filename: pathExcLogger,
      colorize: false,
      maxsize: maxSize,
      format: combineFormat({ enableColor: enableColorPathExcLogger })
    })
  ]
}
if (pathError) {
  logTransports.error = new transports.File({
    filename: pathError,
    level: 'error',
    colorize: false,
    maxsize: maxSize,
    format: combineFormat({ enableColor: enableColorPathError })
  })
}
if (pathLog) {
  logTransports.log = new transports.File({
    filename: pathLog,
    colorize: false,
    maxsize: maxSize,
    format: combineFormat({ enableColor: enableColorPathLog })
  })
}
if (enableConsole) {
  logTransports.console = new transports.Console({
    format: combineFormat()
  })
}

const arrLogTransports = Object.values(logTransports)

const logger = createLogger({
  levels: loggerConfig.levels,
  format: combineFormat(),
  transports: arrLogTransports,
  exceptionHandlers: excLogTransports,
  exitOnError: false,
  silent: arrLogTransports.length === 0
})

class CustomLogger {
  constructor (conf = {}) {
    this.logger = null

    if (typeof conf.label === 'undefined') conf.label = ''
    if (typeof conf.color === 'undefined') conf.color = null
    if (typeof conf.pathLog === 'undefined') conf.pathLog = undefined
    if (typeof conf.pathError === 'undefined') conf.pathError = undefined
    if (typeof conf.pathExcLogger === 'undefined') conf.pathExcLogger = undefined

    this.logConf = Object.assign({}, logConf, conf)

    this.loggerConfig =
      typeof conf.loggerConfig !== 'undefined'
        ? conf.loggerConfig
        : loggerConfig
    this.ignorePrivate = ignorePrivate
    this.customFormat = customFormat

    this._logTransports = {}

    if (typeof this.logConf.pathLog !== 'undefined') {
      this._logTransports.log = new transports.File({
        filename: this.logConf.pathLog,
        format: this.combineFormat({
          enableColor: this.logConf.enableColorPathLog
        }),
        colorize: false,
        maxsize: this.logConf.maxSize
      })
    }
    if (typeof this.logConf.pathError !== 'undefined') {
      this._logTransports.error = new transports.File({
        filename: this.logConf.pathError,
        format: this.combineFormat({
          enableColor: this.logConf.enableColorPathError
        }),
        level: 'error',
        colorize: false,
        maxsize: this.logConf.maxSize
      })
    }
    if (this.logConf.enableConsole === true) {
      this._logTransports.console = new transports.Console({
        format: this.combineFormat()
      })
    }

    this.logTransports = Object.assign({}, logTransports, this._logTransports)

    if (typeof this.logConf.pathExcLogger !== 'undefined') {
      this.excLogTransports = [
        new transports.File({
          filename: this.logConf.pathExcLogger,
          format: this.combineFormat({
            enableColor: this.logConf.enableColorPathExcLogger
          }),
          colorize: false,
          maxsize: this.logConf.maxSize
        })
      ]
    }

    this.arrLogTransports = Object.values(this.logTransports)
  }

  createLogger () {
    this.logger = createLogger({
      levels: this.loggerConfig.levels,
      format: this.combineFormat({
        enableColor: this.logConf.enableColor
      }),
      transports: this.arrLogTransports,
      exceptionHandlers: this.excLogTransports,
      exitOnError: false,
      silent: this.arrLogTransports.length === 0
    })

    return this.logger
  }

  combineFormat (conf = {}) {
    if (typeof conf.enableColor === 'undefined') {
      conf.enableColor = this.logConf.enableColor
    }
    if (typeof conf.label === 'undefined') conf.label = this.logConf.label
    if (typeof conf.color === 'undefined') conf.color = this.logConf.color

    return combine(
      ignorePrivate(),
      splat(),
      label({ label: `${logLabel}${conf.label}` }),
      timestamp(),
      this.customFormat({ ...conf })
    )
  }

  setLogger (logger) {
    this.logger = logger

    return this
  }

  getLogger () {
    return this.logger
  }

  setCustomFormat (customFormat) {
    this.customFormat = customFormat

    return this
  }

  getCustomFormat () {
    return this.customFormat
  }

  setIgnorePrivate (ignorePrivate) {
    this.ignorePrivate = ignorePrivate

    return this
  }

  getIgnorePrivate () {
    return this.ignorePrivate
  }

  setLoggerConfig (loggerConfig) {
    this.loggerConfig = loggerConfig

    return this
  }

  getLoggerConfig () {
    return this.loggerConfig
  }

  getLogTransports () {
    return this.logTransports
  }

  setLogTransports (logTransports) {
    this.logTransports = logTransports

    return this
  }

  getArrLogTransports () {
    return this.arrLogTransports
  }

  setArrLogTransports (arrLogTransports) {
    this.arrLogTransports = arrLogTransports

    return this
  }
}

module.exports = {
  logger,
  CustomLogger
}
