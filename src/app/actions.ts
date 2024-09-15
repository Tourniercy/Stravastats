'use server'

import { auth } from "@/auth"

export async function getServerSideSession() {
    const session = await auth()
    console.log(session)
    return true
}