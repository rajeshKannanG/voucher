'use-strict'

import mongoose from 'mongoose'
const { Schema } = mongoose

const schema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    email: {
        type: String,
        required: true
    },
    voucherCode: {
        type: String
    },
    voucherPIN: {
        type: String
    },
    amount: {
        type: Number
    },
    balance: {
        type: Number
    },
    remaining: {
        type: Number,
        default: 5
    },
    status: {
        type: Number,
        default: 1
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date
    }
})

export class VoucherLogClass { }

schema.loadClass(VoucherLogClass)

export const voucherlog = mongoose.model('voucherlog', schema)