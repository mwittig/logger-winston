'use strict';

var winston = require('winston'),
    _merge = require('lodash.merge'),
    Dconsole = require('winston-dconsole'),
    localConfig = {};


/**
 * Initialize logging with the given configuration. As the given configuration will be cached internally the first
 * invocation will take effect, only. Make sure to invoke this function at the very beginning of the program before
 * other topics using logging get loaded.
 * @param {Object} config - The logging configuration.
 * @param {Object} config.logging - Contains the logging configuration for at least one winston container. A specific
 * container configuration can be provided by defining a configuration for a category matching the topicName. A
 * default configuration can provided by defining a container for the category "default". A container configuration
 * contains at least one transport configuration.
 * Note, you may run into an issue in strict mode, if you need to setup multiple transports of the same type, e.g.,
 * two file transports, as the strict mode inhibits duplicate object keys. In this case the transport name can be
 * augmented with a "#name" postfix, e.g. "file#debug".
 * @param {Object} [config.logging.[topicName]=default] - A specific container for a given topicName can be setup by
 * providing a container configuration where the property name is equal to given topicName. The container configuration
 * must contain at least one winston transport configuration. If the container configuration contains the key
 * "inheritDefault" set to true, the default configuration will be mixed in. This way, it possible to solely define
 * transport properties which shall differ from the default configuration.
 * @param {Object} [config.logging.default=builtin] - Contains the default configuration applicable to loggers without a
 * specific container configuration. The container configuration must contain at least one winston transport
 * configuration.  If no default configuration is provided a console transport configuration with
 * winston builtin defaults will be used.
 */
function init(config) {
    // the given config is only applied if no config has been set already (stored as localConfig)
    if (Object.keys(localConfig).length === 0) {
        if (config.hasOwnProperty("logging") && (config.logging.constructor === {}.constructor)) {
            // config has "logging" key with an {} object value
            //console.log("LOGGER: Setting config");
            localConfig = _merge({}, config.logging);
        }
        else {
            // no valid config - use default
            localConfig = { default: { console: {}}};
        }
    }
}

/**
 * Get a winston logger for a given topic name. If the requested logger does not yet exist a new instance will be
 * created internally.
 * @param {Object} topicName -  The name of the topic, topic or category the returned logger is assigned to. The
 * topicName will be added automatically to the log output, if the configuration does not include the
 * "label" property as part of the applicable winston transport configuration.
 * @returns {Object} The winston logger for the given topic name
 * @example
 * // Initialize logging in the main program file using the server configuration.
 * // You only need to call this once! Modules loaded subsequently, can simply
 * // obtain a logger using getLogger().
 * var config = require("./config.json");
 * var logging = require("./logger-winston");
 * logging.init(serverConfig);
 *
 * // Now you can obtain a logger for the topic "MyApp", for example, and start logging.
 * // The log output will be augmented with a label for the given topic name, automatically.
 * // By default, the output will look like a follows:
 * // info: [MyApp] Hello world!
 * var logger = logging.getLogger("MyApp");
 * logger.info("Hello world!");
 *
 * // You can set up a "default" configuration which applies for all
 * // logger instances unless you provide specific configuration for
 * // some topics.
 * // In the given example the the "default" applies to topic "MyApp" while
 * // a specific configuration has been set for topic "Server".
 * var logger2 = logging.getLogger("Server");
 * logger2.info("Starting Server");
 *
 * @example <caption>Example Configuration config.json</caption>
 * {
 *   "logging": {
 *     "default": {
 *       "console": {
 *         "level": "debug",
 *         "colorize": true,
 *         "timestamp": true
 *       }
 *     },
 *     "Server": {
 *       "console": {
 *         "level": "debug",
 *         "colorize": false,
 *         "timestamp": false
 *       }
 *     }
 *   }
 * }
 *
 * @see https://github.com/flatiron/winston#working-with-multiple-loggers-in-winston
 */
function getLogger(topicName) {
    // The following defaultConfig is a fallback using winston defaults with a console logger. This is just in case
    // init has not been invoked prior to this function.
    var defaultConfig = { console: {}};

    if (localConfig.hasOwnProperty("default")) {
        //console.log("LOGGER: Setting config for topic "+topicName+" using defaults");
        defaultConfig = _merge({}, localConfig["default"]);
    }

    var topicConfig = {};
    if (! localConfig.hasOwnProperty(topicName)) {
        topicConfig = defaultConfig;
    }
    else {
        topicConfig = localConfig[topicName];
    }
    var transports = [];
    for (var key in topicConfig) {
        if (topicConfig.hasOwnProperty(key)) {
            if (key === "inheritDefault") {
                topicConfig = _merge({}, defaultConfig, topicConfig);
                // according to ECMAScript 5.1 standard section 12.6.4 (on for-in loops) it is safe to delete the key
                delete topicConfig[key];
            }
            else {
                if  (! topicConfig[key].hasOwnProperty("label")) {
                    topicConfig[key].label = topicName;
                }
                // Adding multiple file loggers in the configuration is an issue when strict mode is used,
                // as object keys must be unique then while JSON allows for duplicate keys (see RFC 4627, section 2.2).
                // To circumvent this issue, a "#name" postfix can be added to the transport key, e.g. "file#debug".
                // The whole dictionary then is transformed into an array of transport objects.
                var transportName = key;
                if (key.indexOf('#') !== -1) {
                    var stringArray = key.split('#');
                    transportName = stringArray[0];
                }
                topicConfig[key].name = key;

                // To map the transport key given in the configuration to a transport object name we need to
                // capitalize the first letter
                transportName = transportName && transportName.charAt(0).toUpperCase() + transportName.slice(1);
                var transport = new (winston.transports[transportName]) (topicConfig[key]);
                transports.push(transport);

                transport.on("error", function (e) {
                    console.error("Error caught on " + this.name +
                        " transport for logger " + topicName + " (ignored): ", e.message);
                }.bind(transport));
            }
        }
    }

    //console.log(topicName +":", topicConfig);
    return winston.loggers.add(topicName, { transports: transports });
}

module.exports.init = init;
module.exports.getLogger = getLogger;