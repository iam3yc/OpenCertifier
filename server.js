const express = require('express');
const { google } = require('googleapis');
const nodemailer = require("nodemailer");
const multer = require('multer');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

const app = express();
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'views')));

const upload = multer({ dest: 'uploads/' });

const serviceAccountKeyFile = "./certification-454717-f31eb969e61a.json";
const range = 'A:E';

async function _getGoogleSheetClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountKeyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

async function _readGoogleSheet(googleSheetClient, sheetId, tabName, range) {
  const res = await googleSheetClient.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!${range}`,
  });
  return res.data.values;
}

async function draw_image(filePath, name, x, y) {
  const image = await loadImage(filePath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(image, 0, 0, image.width, image.height);
  ctx.font = '50px Montserrat';
  ctx.fillStyle = 'black';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.textAlign = 'center';

  ctx.strokeText(name, x, y);
  ctx.fillText(name, x, y);

  return canvas.toBuffer('image/png');
}

async function mail_sender(mail_address, subject, body,cert) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "",//write your mail address
      pass: ""//create app password and write here
    }
  });

  try {
    const info = await transporter.sendMail({
      from: '',//write your mail
      to: mail_address,
      subject: subject,
      text: body,
      attachments: [
        {
          filename: 'sertifika.png',
          content: cert
        },
      ],
    });
    console.log("Mail gönderildi: %s", info.messageId);
  } catch (error) {
    console.error("Mail gönderme hatası:", error);
  }
}

app.get('/', (req, res) => {
  res.render("index");
});

app.post('/send_certificates', upload.single("template"), async (req, res) => {
  try {
    console.log("Gelen POST verisi:", req.body);
    const namePosition = JSON.parse(req.body.namePosition);
    const googleSheetClient = await _getGoogleSheetClient();
    const client_values = await _readGoogleSheet(googleSheetClient, req.body.sheetId, req.body.sheetName, range);
    
    console.log("Google Sheets'ten gelen veriler:", client_values);

    for (let i = 0; i < client_values.length; i++) {
      const cert=await draw_image(req.file.path, client_values[i][0], parseInt(namePosition.x), parseInt(namePosition.y));
      await mail_sender(client_values[i][1], req.body.mailSubject, req.body.mailBody,cert);
    }

    res.status(200).json({ message: "Sertifikalar başarıyla gönderildi!" });
  } catch (error) {
    console.error("Hata:", error);
    res.status(500).json({ error: "İşlem sırasında hata oluştu." });
  }
});

app.listen(80, () => {
  console.log('Server 80. portta çalışıyor...');
});
