'use-strict'
import feathers from '@feathersjs/feathers'
import express from '@feathersjs/express'
import voucherCodeGenerator, { generate } from 'voucher-code-generator'
import randomatic from 'randomatic'
import moment from 'moment'
import { user } from 'model/user'
import { voucherlog } from 'model/voucherlog'
import { accessToken, verifyToken } from 'utils/accessToken'
import { sendMailer } from 'utils/mail'
const app = express(feathers())

const response = (status, data, res) => {
    res.status(status)
    res.send(JSON.stringify(data))
}


app.post('/signIn', async (req, res) => {
    try {
        const email = req.body.email || ''
        if (!email) {
            return response(500, { success: false, msg: 'email is missing' }, res)
        }
        let findData = await user.findOne({ email })
        if (!findData) {
            findData = await user.create({ email })
        }
        const token = await accessToken(findData._id)
        return response(200, { success: true, msg: 'login successfully', token }, res)
    } catch (error) {
        console.log("Errror: ", error)
        return response(500, { success: false, msg: 'Internal server error' }, res)
    }
})

app.post('/generate', verifyToken, async (req, res) => {
    try {
        const email = req.userData.email || ''
        const userId = req.userData._id || ''
        const amount = req.body.amount || ''
        if (amount == '') {
            return response(500, { success: false, msg: 'amount is missing' }, res)
        }
        const vcode = voucherCodeGenerator.generate({
            prefix: "VCD",
            length: 10,
            count: 1
        })
        let voucherCode = (vcode.length) ? vcode[0] : ''
        const voucherPIN = randomatic('0', 5)
        const data = { amount, email, voucherCode, voucherPIN }
        //await sendMailer(data) * Need userName and password for smtp
        await voucherlog.create({ userId, email, voucherCode, voucherPIN, amount, balance: amount, status: 1 })
        return response(200, { success: true, msg: 'voucher generated successfully', data }, res)
    } catch (error) {
        console.log("Errror: ", error)
        return response(500, { success: true, msg: 'Internal server error' }, res)
    }
})


app.post('/submit', verifyToken, async (req, res) => {
    try {
        const userData = req.userData
        let voucherCode = req.body.voucherCode || ''
        let voucherPIN = req.body.voucherPIN || ''
        let amount = req.body.amount || ''
        amount = parseFloat(amount)
        if (voucherPIN == '') {
            return response(500, { success: false, msg: 'voucherPIN is missing' }, res)
        } else if (voucherCode == '') {
            return response(500, { success: false, msg: 'voucherCode is missing' }, res)
        } else if (amount == '') {
            return response(500, { success: false, msg: 'amount is missing' }, res)
        }
        const voucher = await voucherlog.findOne({ userId: userData._id, voucherCode, voucherPIN })
        if (!voucher) {
            return response(500, { success: false, msg: 'Incorrect voucher details' }, res)
        } else if (voucher.remaining == 0) {
            return response(500, { success: false, msg: 'Max no of attempt used.Better lack next time' }, res)
        } else if (amount > voucher.balance) {
            return response(500, { success: false, msg: 'Insufficent funds' }, res)
        }
        let voucherCreatedDate = moment(voucher.createdAt)
        let voucherUpdatedDate = moment(voucher.updatedAt)
        let dateof = moment()
        let diffHours = dateof.diff(voucherCreatedDate, 'hours')
        let diffMins = dateof.diff(voucherUpdatedDate, 'minutes')
        let diffSec = dateof.diff(voucherUpdatedDate, 'seconds')
        // console.log(voucherCreatedDate, 'v', dateof, 'c', diffHours, 'hours', diffMins, 'mins', diffSec, 'sec')
        if (diffHours >= 24) {
            return response(500, { success: false, msg: 'Voucher expired' }, res)
        } else if (diffSec < 600 && diffSec != 0) {
            let nxtMins = 10 - diffMins
            return response(500, { success: false, msg: `Please try again after ${nxtMins} mins` }, res)
        }
        let remaining = voucher.remaining - 1
        let balance = voucher.balance - amount
        let updatedData = (voucher.remaining == 1 || voucher.balance == amount) ?
            { balance, remaining, updatedAt: moment().format(), status: 3 } :
            { balance, remaining, updatedAt: moment().format(), status: 2 }

        await voucherlog.findOneAndUpdate({ _id: voucher._id }, updatedData)
        return response(200, { success: true, msg: 'Voucher used successfully' }, res)
    } catch (error) {
        console.log("Errror: ", error)
        return response(500, { success: false, msg: 'Internal server error' }, res)
    }
})

app.post('/list', verifyToken, async (req, res) => {
    try {
        let statusArray = ["active", "partially redeemed", "redeemed"]
        const userData = req.userData || ''
        const limit = req.body.limit || 10
        const page = req.body.page || 1
        const skip = limit * (page - 1)
        const email = req.body.email || ''
        let startDate = req.body.startDate || ''
        let endDate = req.body.endDate || ''
        let status = req.body.status || 0
        let filterData = { userId: userData._id }
        if (email != '') {
            filterData.email = email
        }

        if (startDate != '' && endDate != '') {
            startDate = moment(startDate).startOf('day')
            endDate = moment(endDate).endOf('day')
            filterData.createdAt = { $gte: startDate, $lte: endDate }
        }

        if (status != 0) {
            filterData.status = status
        }
        let listData = await voucherlog.find(filterData).skip(skip).limit(limit)
        let totalRecord = await voucherlog.count(filterData)
        let data = {
            totalRecord,
            limit,
            page,
            list: []
        }
        if (totalRecord) {
            let listArray = []
            for (let index = 0; index < listData.length; index++) {
                let element = listData[index]
                let temp = {}
                temp.email = element.email
                temp.voucherCode = element.voucherCode
                temp.voucherPIN = element.voucherPIN
                temp.amount = element.amount
                temp.balance = element.balance
                temp.createdAt = moment(element.createdAt).format('L')
                temp.status = statusArray[element.status - 1]
                listArray.push(temp)
            }
            data.list = listArray
        }
        return response(200, { success: true, data }, res)
    } catch (error) {
        console.log("Errror: ", error)
        return response(500, { success: false, msg: 'Internal server error' }, res)
    }
})


export default app