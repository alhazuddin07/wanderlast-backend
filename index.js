import express from 'express';
import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const app = express()
const PORT = 5000

app.use(cors())
app.use(express.json());


const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();

const db = mongoClient.db("wanderlust");
const destinationCollection = db.collection('destination');

const bookingCollection = db.collection("bookings")

const verifyToken = async(req, res, next) => {
  const authHeader = req.headers.authorization
  
  if(!authHeader) {
    return res.status(401).send({msg: "Unauthorized!"});
  }
  
  const token = authHeader.split(" ")[1]

  if(!token) {
    return res.status(401).send({msg: 'Unauthorized!'})
  }

  const JKWS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));

  try {
    const {payload} = await jwtVerify(token, JKWS)
    next();
  } catch (error) {
    return res.status(500).send({msg: 'Server Error'});
  };

};

app.post('/add-destination', verifyToken, async (req, res) => {
  const data = req.body

  const result = await destinationCollection.insertOne(data);

  console.log(result);

  res.send(result)
});


app.post('/booking', verifyToken, async (req, res) => {
  const data = req.body;
  const result = await bookingCollection.insertOne(data);
  res.send(result);
})


app.get('/bookings/:email', verifyToken, async (req, res) => {

  const { email } = req.params;

  const result = await bookingCollection.find({ userEmail: email }).toArray()

  res.send(result);

});

app.delete('/booking/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await bookingCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch {
    res.status(400).send({ message: 'Invalid booking id' });
  }
});


app.get('/destinations', async (req, res) => {
  const result = await destinationCollection.find().toArray();

  res.send(result);
});

app.get('/feature-destinations', async(req, res )=> {
  const result = await destinationCollection.find().limit(5).toArray()
  res.send(result)
})

app.get('/destination/:id', verifyToken, async (req, res) => {

  const { id } = req.params
  const result = await destinationCollection.findOne({ _id: new ObjectId(id) })
  res.send(result)
});

app.patch('/destination/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  const result = await destinationCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedData }
  )
  res.send(result)
});

app.delete('/destination/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const result = await destinationCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});



app.get('/', (req, res) => {
  res.send('Hello World!')
});

app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}`)
});

export default app;