'use client'

import Link from 'next/link'

const Logo = () => {
  return (
    <Link href={'/'}>
      <span
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white text-lg font-bold"
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
        }}
      >
        Ix
      </span>
    </Link>
  )
}

export default Logo
