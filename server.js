import express from "express";
import { pipeline } from '@xenova/transformers';
import { MongoClient } from "mongodb";

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'))

const MONGODB_URI = 'mongodb+srv://yaoxing:wrenpass1019@athens4.vcbcg.mongodb.net/?retryWrites=true&w=majority';
const MONGODB_COLLECTION = 'recipes';
const MONGODB_DATABASE = 'hackathon';
const dbClient = new MongoClient(MONGODB_URI);
await dbClient.connect();

const getEmbeddings = async (input) => {
    // Create a feature-extraction pipeline
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    // Compute sentence embeddings
    const sentences = [input];
    const output = await extractor(sentences, { pooling: 'mean', normalize: true });
    const embedding = output.tolist()[0];
    
    return embedding;
};

const recommend = async (embedding, indexName) => {
    const collection = dbClient.db(MONGODB_DATABASE).collection(MONGODB_COLLECTION);
    const results = await collection.aggregate([
        {
            "$vectorSearch": {
                "index": indexName,
                "path": "embedding_ingredients",
                "queryVector": embedding,
                "numCandidates": 100,
                "limit": 5
            }
        }, {
            "$project": {
                embedding_ingredients: 0,
                embedding_steps: 0
            }
        }
    ]
    ).toArray();
    return results
};

app.post("/recommend", async (req, res) => {
    try {
        var ingredients = req.body.ingredients;
        var embedding = await getEmbeddings(ingredients);
        var result = await recommend(embedding, "ingredients_vector");

        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
