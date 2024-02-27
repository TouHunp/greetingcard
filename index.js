const express = require('express');
const path = require('path');
const axios = require('axios');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const { createCanvas, loadImage, registerFont } = require('canvas');

const app = express();
const port = process.env.PORT || 3755;
const recaptchaSecretKey = '輸入您的recaptchaSecretKey';
let recaptchaVerificationResult = null;

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/get-recaptcha-site-key', (req, res) => {
    res.json({ siteKey: '輸入您的recaptcha-site-key' });
});

app.post('/recaptcha-verify', async (req, res) => {
    try {
        const recaptchaResponse = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
            params: {
                secret: recaptchaSecretKey,
                response: req.body.recaptchaToken,
            },
        });

        if (recaptchaResponse.data.success) {
            recaptchaVerificationResult = true;
            res.json({ success: true });
        }
        else {
            res.json({ success: false });
            return res.status(400).json({ error: 'reCAPTCHA verification failed' });
        }
    } catch (error) {
        console.error('錯誤:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.post('/generate', express.json(), async (req, res) => {
    try {
        if (!recaptchaVerificationResult) {
            return res.status(400).json({ error: 'reCAPTCHA verification failed' });
        }
        const userText = req.body.userText + "  敬賀";
        const backgroundImage = await loadImage('public/card.png');
        var x;
        var y;

        const canvas = createCanvas(backgroundImage.width, backgroundImage.height);
        const context = canvas.getContext('2d');
        const regexB = /[A-Z]/g;
        const regexS = /[a-z1-9_]/g;
        const regext = /[\s'.,-]/g;
        const Blength = req.body.userText.match(regexB) ? req.body.userText.match(regexB).length : 0;
        const Slength = req.body.userText.match(regexS) ? req.body.userText.match(regexS).length : 0;
        const Tlength = req.body.userText.match(regext) ? req.body.userText.match(regext).length : 0;

        context.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

        context.font = '70px Noto Sans TC'; // 字型和大小
        context.fillStyle = '#FDC433'; // 文字顏色


        x = 1540 - Blength * 47 - Slength * 37 - Tlength * 20 - (req.body.userText.length - Blength - Slength - Tlength) * 70
        y = 1140;
        context.fillText(userText, x, y);

        const imageBuffer = canvas.toBuffer('image/png');


        const imgurUploadResponse = await axios.post('https://api.imgur.com/3/image', {
            image: Buffer.from(imageBuffer).toString('base64'),
            type: 'base64',
        }, {
            headers: {
                'Authorization': 'Client-ID imgurClient-ID',
            },
        });



        res.json({ imgurLink: imgurUploadResponse.data.data.link });
        //console.log(imgurUploadResponse.data.data.link);
    } catch (error) {
        console.error('錯誤:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/send-email', async (req, res) => {
    try {
        const { email, imgurLink } = req.body;
        //console.log(email, imgurLink);
        if (!recaptchaVerificationResult) {
            return res.status(400).json({ error: 'reCAPTCHA verification failed' });
        }

        const transporter = nodemailer.createTransport({
            host: '信箱 or 郵件伺服器 ', // Outlook SMTP ip
            port: 25, // SMTP 未加密port
            secure: false, // 不使用SSL
            auth: {
                user: '', // 
                pass: '' // 
            }
        });

        const mailOptions = {
            from: '"郵件伺服器" <noreply@test.com.tw>',
            to: email,
            subject: '祝您順心',
            html: `<img src="${imgurLink}" alt="Generated Image">
            <br/><br/><br/><p style="font-family: Arial, sans-serif;">*若圖片無法顯示請先點選下載圖片</p>
        <p style="font-family: Arial, sans-serif;">*本信件為系統代為發送請勿直接回覆。</p>`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                //console.error(error);
                res.status(500).json({ message: '郵件發送失敗' });
            } else {
                //console.log('Email sent: ' + info.response);
                res.json({ message: '郵件已成功發送' });
            }
        });
    } catch (error) {
        console.error('錯誤:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
