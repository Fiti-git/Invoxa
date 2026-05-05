import React from 'react'
import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './css/globals.css'
import { AuthProvider } from '@/lib/auth'
import { ToastProvider, GlobalErrorListener } from '@/lib/toast'
import { ErrorBoundary } from '@/components/error-boundary'

const manrope = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Invoxa — AI Invoice Extraction',
  description: 'Upload invoice PDFs, let AI extract them into editable drafts.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en' className='light'>
      <head>
        <link rel='icon' type='image/svg+xml' href='/images/icon-mark/invoxa-icon.svg' />
        <link rel='icon' type='image/png' sizes='32x32' href='/images/favicon/favicon-32.png' />
        <link rel='icon' type='image/png' sizes='16x16' href='/images/favicon/favicon-16.png' />
        <link rel='apple-touch-icon' sizes='180x180' href='/images/app-icon/invoxa-app-icon-180.png' />
        <link rel='manifest' href='/manifest.webmanifest' />
        <meta name='theme-color' content='#5BBF5B' />
      </head>
      <body className={`${manrope.className}`}>
        <ErrorBoundary>
          <ToastProvider>
            <GlobalErrorListener />
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
