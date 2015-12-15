// Initialize logging in the main program file using the server configuration.
// You only need to call this once! Modules loaded subsequently, can simply
// obtain a logger using getLogger().
var config = require("./config.json");
var logging = require("../logger-winston");
logging.init(config);

// Now you can obtain a logger for the topic "MyApp", for example, and start logging.
// The log output will be augmented with a label for the given topic name, automatically.
// By default, the output will look like a follows:
// info: [MyApp] Hello world!
var logger = logging.getLogger("MyApp");
logger.info("Hello world!");

// You can set up a "default" configuration which applies for all
// logger instances unless you provide specific configuration for
// some topics.
// In the given example the the "default" applies to topic "MyApp" while
// a specific configuration has been set for topic "Server".
var logger2 = logging.getLogger("Server");
logger2.info("Starting Server");