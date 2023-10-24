const dotenv = require('dotenv');

dotenv.config();

module.exports = {
    PORT : process.env.PORT,
    MONGO_CONNECT_URL:process.env.MONGO_CONNECT_URL
}