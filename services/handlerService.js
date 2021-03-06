function HandlerService(log) {
    // The registered handlers
    this.handlers = {};
    this.log = log;
}

// Registers a new route
HandlerService.prototype.add = function(handler) {
    // Ensure we have not already added an handler for this command
    if (!this.handlers[handler.handles]) {
        this.log.info("Registered handler for command: " + handler.handles);
        this.handlers[handler.handles] = handler;
    }
};

// Handles routing a request to the appropriate command handler
HandlerService.prototype.handle = function * (request) {
    try {
        var words = request.split(' ');
        command = words[1];
        
        // Route the command
        // Check if we have a handler registered for the command
        if ( !! this.handlers[command]) {
            var response = yield this.handlers[command].handle(request);

            if (response == null || response == undefined || response == ''){
                throw "HandlerOutputException";
            }
                
            return response;
        } else {
            this.log.warn("No handler registered for command: " + command);
            // Todo make this not suck
            return yield this.handlers['help'].handle(request);
        }
    } catch (e) {
        // Bad things are happening
        this.log.error(e);
        throw "CommandHandleException"
    }
};

HandlerService.prototype.getHandlers = function() {
    return this.handlers;
};

module.exports = HandlerService;