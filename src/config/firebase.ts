import * as admin from 'firebase-admin'

import { ENV } from './loadEnv'

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: ENV.FIREBASE_PROJECT_ID,
        clientEmail: ENV.FIREBASE_CLIENT_EMAIL,
        privateKey: ENV.FIREBASE_PRIVATE_KEY,
    }),
})

export default admin
