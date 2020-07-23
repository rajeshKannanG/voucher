'use strict'
import nodemailer from 'nodemailer'
import config from './../../config'
export const sendMailer = async (data) => {
    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: 'username', // generated ethereal user
            pass: 'password' // generated ethereal password
        }
    })
    let info = await transporter.sendMail({
        from: '"Test Admin " <admin@voucher.com>', // sender address
        to: data.email, // list of receivers
        subject: 'Voucher PIN', // Subject line
        text: `Voucher  is ${data.voucherCode} and PIN is ${data.voucherPIN}` // plain text body
    })

    console.log('Message sent: %s', info.messageId)
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info))
}