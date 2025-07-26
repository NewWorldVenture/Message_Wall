
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

let currentMessage = { text: "", endTime: 0 };
let messageHistory = [];

app.use(bodyParser.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/viewer", (req, res) => {
  res.sendFile(path.join(__dirname, "viewer.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/message", (req, res) => {
  const now = Date.now();
  if (now < currentMessage.endTime) {
    res.json({ message: currentMessage.text, endTime: currentMessage.endTime });
  } else {
    res.json({ message: "" });
  }
});

app.get("/history", (req, res) => {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recent = messageHistory.filter((msg) => msg.timestamp > oneDayAgo);
  res.json(recent);
});

app.post("/purchase", async (req, res) => {
  const { token, message, minutes } = req.body;
  const amount = minutes * 100;

  try {
    await stripe.charges.create({
      amount,
      currency: "usd",
      source: token.id,
      description: "Message Wall Post",
    });

    const timestamp = Date.now();
    currentMessage.text = message;
    currentMessage.endTime = timestamp + minutes * 60000;

    messageHistory.push({ text: message, timestamp });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
