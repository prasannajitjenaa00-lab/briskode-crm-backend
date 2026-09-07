const dns = require('dns');
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/meta_crm';

    // Handle SRV record resolution reliably for Atlas clusters on Windows/local networks
    if (mongoUri.startsWith('mongodb+srv://')) {
      try {
        dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
      } catch (dnsErr) {
        console.warn(`[DB] Warning: Could not configure public DNS servers: ${dnsErr.message}`);
      }
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`[DB] MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`[DB] Connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
