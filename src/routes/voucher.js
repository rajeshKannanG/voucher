'use-strict'
import voucherService from 'services/voucherService'

export default (app) => {
    console.log("routess")
    app.use('/voucher', voucherService)
}
