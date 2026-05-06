import { uniqueId } from 'lodash'

export interface ChildItem {
  id?: number | string
  name?: string
  icon?: any
  children?: ChildItem[]
  item?: any
  url?: any
  color?: string
  disabled?: boolean
  subtitle?: string
  badge?: boolean
  badgeType?: string
  isPro?: boolean
  perm?: string
}

export interface MenuItem {
  heading?: string
  name?: string
  icon?: any
  id?: number
  to?: string
  items?: MenuItem[]
  children?: ChildItem[]
  url?: any
  disabled?: boolean
  subtitle?: string
  badgeType?: string
  badge?: boolean
  isPro?: boolean
  perm?: string
}

const SidebarContent: MenuItem[] = [
  {
    heading: 'Workspace',
    children: [
      {
        name: 'Dashboard',
        icon: 'solar:widget-add-line-duotone',
        id: uniqueId(),
        url: '/',
      },
      {
        name: 'Documents',
        icon: 'solar:document-text-line-duotone',
        id: uniqueId(),
        url: '/documents',
        perm: 'invoices.view',
      },
      {
        name: 'Invoices',
        icon: 'solar:bill-list-line-duotone',
        id: uniqueId(),
        url: '/invoices',
        perm: 'invoices.view',
      },
      {
        name: 'Upload',
        icon: 'solar:upload-line-duotone',
        id: uniqueId(),
        url: '/documents/upload',
        perm: 'documents.upload',
      },
    ],
  },
  {
    heading: 'Admin',
    children: [
      {
        name: 'Cost & Usage',
        icon: 'solar:chart-line-duotone',
        id: uniqueId(),
        url: '/admin/cost',
        perm: 'billing.view',
      },
      {
        name: 'Templates',
        icon: 'solar:layers-line-duotone',
        id: uniqueId(),
        url: '/admin/templates',
        perm: 'templates.manage',
      },
      {
        name: 'Users',
        icon: 'solar:users-group-rounded-line-duotone',
        id: uniqueId(),
        url: '/admin/users',
        perm: 'users.manage',
      },
      {
        name: 'Settings',
        icon: 'solar:settings-line-duotone',
        id: uniqueId(),
        url: '/admin/settings',
        perm: 'settings.manage',
      },
    ],
  },
]

export default SidebarContent
