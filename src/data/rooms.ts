import { KabigonCard } from '../core/roles/kabigon'

export const rooms = [
  {
    id: KabigonCard.roleId,
    name: KabigonCard.roleName,
    last: '',
    ts: 0
  }
]

export type Room = {
  id: string
  name: string
  last: string
  ts: number
}
