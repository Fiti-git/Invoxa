'use client'

import { useState } from 'react'
import { Icon } from '@iconify/react'
import Profile from './Profile'
import SidebarLayout from '../sidebar/Sidebar'
import FullLogo from '../shared/logo/FullLogo'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useSidebarState } from '@/lib/sidebar-state'

const Header = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { collapsed, toggle } = useSidebarState()

  return (
    <>
      <header className='sticky top-0 z-20 bg-background border-b border-border/60'>
        <div className='h-[68px] flex items-center justify-between px-4 sm:px-6'>
          {/* Left: collapse toggle (desktop) + mobile menu + mobile logo */}
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={toggle}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className='hidden xl:inline-flex h-10 w-10 items-center justify-center rounded-full text-link hover:text-primary hover:bg-lightprimary transition-colors'
            >
              <Icon
                icon={collapsed ? 'tabler:layout-sidebar-right-collapse' : 'tabler:layout-sidebar-left-collapse'}
                width={20}
                height={20}
              />
            </button>

            <button
              type='button'
              onClick={() => setIsOpen(true)}
              aria-label='Open menu'
              className='xl:hidden h-10 w-10 inline-flex items-center justify-center rounded-full text-link hover:text-primary hover:bg-lightprimary'
            >
              <Icon icon='tabler:menu-2' height={20} width={20} />
            </button>

            <div className='xl:hidden'>
              <FullLogo />
            </div>
          </div>

          {/* Right: profile */}
          <div className='flex items-center gap-1'>
            <Profile />
          </div>
        </div>
      </header>

      {/* Mobile sidebar drawer */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side='left' className='w-64 p-0'>
          <VisuallyHidden>
            <SheetTitle>sidebar</SheetTitle>
          </VisuallyHidden>
          <SidebarLayout onClose={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}

export default Header
