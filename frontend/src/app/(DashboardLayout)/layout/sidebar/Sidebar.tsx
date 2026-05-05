'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import SimpleBar from 'simplebar-react'
import { Icon } from '@iconify/react'
import SidebarContent from './Sidebaritems'
import { useAuth } from '@/lib/auth'
import { useSidebarState } from '@/lib/sidebar-state'

const filterByPerm = (items: any[], hasPerm: (p: string) => boolean): any[] => {
  return items
    .map((it) => {
      if (it.children?.length) {
        const kids = filterByPerm(it.children, hasPerm)
        return kids.length ? { ...it, children: kids } : null
      }
      if (it.perm && !hasPerm(it.perm)) return null
      return it
    })
    .filter(Boolean) as any[]
}

const NavLink = ({
  item,
  active,
  collapsed,
  onClose,
}: {
  item: any
  active: boolean
  collapsed: boolean
  onClose?: () => void
}) => {
  return (
    <Link
      href={item.url || '#'}
      onClick={onClose}
      title={collapsed ? item.name : undefined}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        collapsed ? 'justify-center' : ''
      } ${
        active
          ? 'bg-lightprimary text-primary font-medium'
          : 'text-link hover:bg-lightprimary hover:text-primary'
      }`}
    >
      <Icon icon={item.icon || 'ri:checkbox-blank-circle-line'} height={20} width={20} />
      {!collapsed && <span className='truncate flex-1'>{item.name}</span>}
    </Link>
  )
}

const SubmenuBlock = ({
  item,
  pathname,
  collapsed,
  onClose,
}: {
  item: any
  pathname: string
  collapsed: boolean
  onClose?: () => void
}) => {
  const childActive = item.children.some((c: any) => pathname === c.url)
  const [open, setOpen] = useState(childActive)

  if (collapsed) {
    return (
      <div className='flex flex-col gap-1' title={item.name}>
        <div className='flex justify-center py-2 text-link'>
          <Icon icon={item.icon} height={20} width={20} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-link hover:bg-lightprimary hover:text-primary ${
          childActive ? 'text-primary font-medium' : ''
        }`}
      >
        <Icon icon={item.icon} height={20} width={20} />
        <span className='truncate flex-1 text-left'>{item.name}</span>
        <Icon
          icon='solar:alt-arrow-down-linear'
          height={14}
          width={14}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className='ml-7 mt-1 flex flex-col gap-0.5 border-l border-border/60 pl-3'>
          {item.children.map((c: any) => (
            <NavLink
              key={c.id}
              item={c}
              active={pathname === c.url}
              collapsed={false}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const SidebarLayout = ({ onClose }: { onClose?: () => void }) => {
  const pathname = usePathname()
  const { hasPerm } = useAuth()
  const { collapsed } = useSidebarState()

  return (
    <div className='flex flex-col h-full w-full'>
      {/* Logo */}
      <div
        className={`flex items-center h-[68px] border-b border-border/60 ${
          collapsed ? 'justify-center px-2' : 'px-4'
        }`}
      >
        <Link href='/' className='flex items-center' aria-label='Invoxa'>
          {collapsed ? (
            <Image
              src='/images/icon-mark/invoxa-icon.svg'
              alt='Invoxa'
              width={36}
              height={36}
              priority
            />
          ) : (
            <Image
              src='/images/lockup-horizontal/invoxa-horizontal-light.svg'
              alt='Invoxa'
              width={140}
              height={40}
              priority
            />
          )}
        </Link>
      </div>

      {/* Items */}
      <SimpleBar className='flex-1 min-h-0'>
        <nav className={`py-4 ${collapsed ? 'px-2' : 'px-4'} space-y-6`}>
          {SidebarContent.map((section, idx) => {
            const visible = filterByPerm(section.children || [], hasPerm)
            if (!visible.length) return null
            return (
              <div key={idx} className='space-y-1'>
                {section.heading && !collapsed && (
                  <p className='px-3 text-[11px] font-semibold uppercase tracking-wider text-charcoal/70 dark:text-darkcharcoal/70 mb-2'>
                    {section.heading}
                  </p>
                )}
                {section.heading && collapsed && (
                  <div className='border-t border-border/60 my-2' />
                )}
                {visible.map((item: any) =>
                  item.children?.length ? (
                    <SubmenuBlock
                      key={item.id}
                      item={item}
                      pathname={pathname}
                      collapsed={collapsed}
                      onClose={onClose}
                    />
                  ) : (
                    <NavLink
                      key={item.id}
                      item={item}
                      active={pathname === item.url}
                      collapsed={collapsed}
                      onClose={onClose}
                    />
                  )
                )}
              </div>
            )
          })}
        </nav>
      </SimpleBar>
    </div>
  )
}

export default SidebarLayout
