const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const secret = process.env.ACCESS_TOKEN_SECRET;
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CLUSTER}.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

app.get("/", (req, res) => {
	res.redirect("http://localhost:5173/");
});

const run = async () => {
	try {
		// await client.connect();
		const poemsColl = client.db("MiniPoetsDB").collection("poems");
		const usersColl = client.db("MiniPoetsDB").collection("users");

		//

		const verifyToken = (req, res, next) => {
			if (!req.headers.authorization) {
				return res.status(401).send({ message: "unauthorized access" });
			}

			const token = req.headers.authorization.split(" ")[1];

			jwt.verify(token, secret, (error, decoded) => {
				if (error) {
					return res
						.status(401)
						.send({ message: "unauthorized access" });
				}

				req.decoded = decoded;
				next();
			});
		};

		app.post("/auth", (req, res) => {
			const token = jwt.sign(req.body, secret, { expiresIn: "1h" });
			res.send({ token });
		});

		app.post("/users", async (req, res) => {
			const { email } = req.body;
			const update = { $set: req.body };
			const upsert = { upsert: true };
			const result = await usersColl.updateOne({ email }, update, upsert);
			res.send(result);
		});

		//

		app.get("/poems", async (req, res) => {
			const result = await poemsColl.find().toArray();
			res.send(result);
		});

		app.get("/poems/:id", async (req, res) => {
			try {
				const _id = new ObjectId(req.params.id);
				const result = await poemsColl.findOne({ _id });
				res.send(result);
			} catch (error) {
				res.send(null);
			}
		});

		app.get("/poems/user/:uid", verifyToken, async (req, res) => {
			const { uid } = req.params;
			const result = await poemsColl.find({ writtenBy: uid }).toArray();
			res.send(result);
		});

		app.post("/poems", verifyToken, async (req, res) => {
			const result = await poemsColl.insertOne(req.body);
			res.send(result);
		});

		app.patch("/poems/:id", verifyToken, async (req, res) => {
			const _id = new ObjectId(req.params.id);
			const update = { $set: req.body };
			const result = await poemsColl.updateOne({ _id }, update);
			res.send(result);
		});

		app.delete("/poems/:id", verifyToken, async (req, res) => {
			const _id = new ObjectId(req.params.id);
			const result = await poemsColl.deleteOne({ _id });
			res.send(result);
		});
	} finally {
		// await client.close();
	}
};

run();

app.listen(port, () => {
	console.log(`Listening to port ${port}`);
});
