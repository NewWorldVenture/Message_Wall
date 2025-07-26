const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

let currentMessage = { text: "", endTime: 0 };

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "letmein";

// Basic Auth Middleware
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin Area"');
    return res.status(401).send("Authentication required.");
  }

  const base64 = auth.split(" ")[1];
  const [user, pass] = Buffer.from(base64, "base64").toString().split(":");

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    return next();
  }

  res.setHeader("WWW-Authenticate", 'Basic realm="Admin Area"');
  return res.status(401).send("Access denied.");
}

app.use(bodyParser.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/viewer", (req, res) => {
  res.sendFile(path.join(__dirname, "viewer.html"));
});

app.get("/admin", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/admin-status", requireAuth, (req, res) => {
  const now = Date.now();
  const timeRemaining = Math.max(currentMessage.endTime - now, 0);
  res.json({
    message: currentMessage.text,
    timeRemaining,
  });
});

app.post("/admin-clear", requireAuth, (req, res) => {
  currentMessage = { text: "", endTime: 0 };
  res.json({ success: true });
});

app.get("/message", (req, res) => {
  const now = Date.now();
  if (now < currentMessage.endTime) {
    res.json({
      message: currentMessage.text,
      endTime: currentMessage.endTime
    });
  } else {
    res.json({ message: "" });
  }
});

app.post("/purchase", async (req, res) => {
  const { token, message, minutes } = req.body;
  const amount = minutes * 100; // $1 per minute

  try {
    await stripe.charges.create({
      amount,
      currency: "usd",
      source: token.id,
      description: "Message Wall Post",
    });

    currentMessage.text = message;
    currentMessage.endTime = Date.now() + minutes * 60000;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
