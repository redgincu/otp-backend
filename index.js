const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const OTP_STORE = {};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail(to, subject, text) {
  await transporter.sendMail({
    from: `"Prompt OTP" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
  });
}

async function sendWA(number, message) {
  await axios.post(
    "https://api.fonnte.com/send",
    { target: number, message },
    { headers: { Authorization: process.env.FONNTE_TOKEN } }
  );
}

app.post("/login-request", async (req, res) => {
  const { role, destination, method } = req.body;
  const otp = generateOTP();
  OTP_STORE[destination] = otp;

  try {
    if (role === "master") {
      await sendEmail(process.env.MASTER_EMAIL, "OTP Login Master", `Kode OTP Anda: ${otp}`);
      await sendWA(process.env.MASTER_WA, `OTP Login Master Anda: ${otp}`);
      res.json({ message: "OTP dikirim ke email & WA Master." });
    } else {
      if (method === "email") await sendEmail(destination, "OTP Login User", `Kode OTP Anda: ${otp}`);
      else if (method === "wa") await sendWA(destination, `OTP Login Anda: ${otp}`);
      await sendEmail(process.env.MASTER_EMAIL, "Notifikasi Login User", `User ${destination} mencoba login via ${method}`);
      res.json({ message: "OTP dikirim ke user." });
    }
  } catch (err) {
    console.error("Gagal mengirim OTP:", err);
    res.status(500).json({ error: "Gagal mengirim OTP" });
  }
});

app.post("/verify-otp", (req, res) => {
  const { destination, otp } = req.body;
  if (OTP_STORE[destination] && OTP_STORE[destination] === otp) {
    delete OTP_STORE[destination];
    res.json({ success: true, message: "Login berhasil" });
  } else {
    res.status(401).json({ success: false, message: "OTP salah atau kadaluarsa" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server OTP berjalan di PORT ${PORT}`);
});
