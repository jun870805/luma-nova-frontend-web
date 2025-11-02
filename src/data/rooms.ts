import { availableRoles } from '../core/roles/roleAdapter'

export type Room = {
  id: string
  name: string
  last: string
  ts: number
}

export const rooms: Room[] = availableRoles.map(r => ({
  id: r.roleId,
  name: r.roleName,
  last: '',
  ts: 0
}))
