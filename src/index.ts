import express, { Request, Response } from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/pets", (req: Request, res: Response) => {
  res.json([{ id: 1, name: "Fluffy", type: "cat" }]);
});

app.get("/health", (req, res) => {
  res.sendStatus(200);
});

export default app;
