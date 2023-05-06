const { MongoClient } = require('mongodb');
const UrlModel = require('../models/url');

// Log URL Collection from urlShortner DB
(async () => {
    const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/urlShortner';
    const dbName = dbUrl.split('/').pop().split('?')[0];
    const collectionName = UrlModel.collection.name;
    const client = new MongoClient(dbUrl);
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(collectionName);
        try {
            const documents = await collection.find().toArray();
            for (const doc of documents) {
                console.log(doc); 
            }
        } catch (error) {
            console.error(error);
        }
    } catch (error) {
        console.error(error);
    } finally {
        await client.close();
    } 
})();