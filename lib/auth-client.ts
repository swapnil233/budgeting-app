import { createAuthClient } from 'better-auth/react'

export const { signIn, signUp, signOut, useSession, updateUser, changePassword, deleteUser } = createAuthClient()