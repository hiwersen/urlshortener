const { MongoClient } = require('mongodb');
const UrlModel = require('./models/url');

// Normalize original_url to cut off the protocol and or www. subdomain in the existing documents
(async () => {
    const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/urlShortner';
    const dbName = dbUrl.split('/').pop().split('?')[0];
    const collectionName = UrlModel.collection.name;
    const client = new MongoClient(dbUrl);
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(collectionName);
        const protocolOrSubdomain = /^(https?\:\/\/|www\.)(?=.+)/;
        const protocolAndSubdomain = /^(https?\:\/\/)?(www\.)?(?=.+)/;

        try {
            const documentsToUpdate = await collection.find({ original_url: { $regex: protocolOrSubdomain } }).toArray();
            for (const doc of documentsToUpdate) {
                console.log('URL to normalize: ' + doc.original_url);
                const normalized_url = doc.original_url.replace(protocolAndSubdomain, '');
                console.log('Normalized URL: ' + normalized_url);
                try {
                    await collection.updateOne({ _id: doc._id }, { $set: { original_url:  normalized_url }});
                } catch (error) {
                    if (error.code === 11000) {
                        console.warn(`Skipping update for duplicate normalized URL: ${normalized_url}`);
                    } else {
                        console.error(error);
                    }
                }
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