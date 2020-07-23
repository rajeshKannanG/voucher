'use-strict'

import mongoose from 'mongoose'
const { Schema } = mongoose

const schema = new Schema({
    email: {
        type: String,
        required: true
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

export class UserClass { }

schema.loadClass(UserClass)

export const user = mongoose.model('user', schema)