const rateLimiter = require('./middleware/rateLimiter');
app.use(rateLimiter);
const { mockAuth } = require('./middleware/auth');
app.use(mockAuth);