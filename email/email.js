const nodemailer = require('nodemailer')
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
require('dotenv').config();


const createTransporter = async () => {
  const oauth2Client = new OAuth2(
    process.env.OAUTH_CLIENTID,
    process.env.OAUTH_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.OAUTH_REFRESH_TOKEN
  });


  const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        reject("Failed to create access token :(");
      }
      resolve(token);
    });
  });
  
  
  let transporter = nodemailer.createTransport({
    service: "gmail",
      auth: {
        type: 'OAuth2',
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
        accessToken,
        clientId: process.env.OAUTH_CLIENTID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN
      }
    });


    return transporter;

};


const sendEmail =async (toEmail, subject, text)=>{

    let mailOptions = {
      from: process.env.MAIL_USERNAME,
      to: toEmail,
      subject: subject,
      text: text()
    };

    let emailTransporter = await createTransporter();
    
    try{
      emailTransporter.sendMail(mailOptions);
    }catch(err){
      console.log(err)
    }

}


module.exports = sendEmail