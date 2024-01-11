/* eslint-disable import/extensions */
const Question = require('../models/question.model');
const fs = require('fs');
const Config = require('../config/config.js');

// Email Services.
const formData = require('form-data');
const Mailgun = require('mailgun.js');

const mailgun = new Mailgun(formData);
const mailgunClient = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
});

/// //////////////////////////////////////////////////////////////////////
/// ///////////////////////////// Create /////////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function create(req, res) {
  const { creator, name, email, message } = req.body;

  const q = Question();
  q.creator = creator;
  q.name = name;
  q.email = email;
  q.message = message;
  q.createdAt = Date.now();
  await q.save();

  sendContactUsEmail(name, email, message);

  res.json({
    result: true,
  });
}

function sendContactUsEmail(name, email, message) {
  var html = fs.readFileSync('./email_templates/contactus_email_template.html', 'utf8');
  html = html.replace('{{name}}', name);
  html = html.replace('{{email}}', email);
  html = html.replace('{{message}}', message);

  const mailOptions = {
    from: `${name} <${email}>`,
    to: [Config.ADMIN_EMAIL, 'james@gad.ai'],
    subject: Config.APP_NAME + ' Contact Us',
    html,
  };

  mailgunClient.messages
    .create(process.env.MAILGUN_DOMAIN, mailOptions)
    .then((msg) => console.log('Contact Us Email Sent: ', msg))
    .catch((err) => console.log('Contact Us Email Failed: ', err));
}

module.exports = {
  create,
};
