import { KabigonCard } from '../core/roles/kabigon'
import { SistersCard } from '../core/roles/sisters'

export const rooms = [
  {
    id: KabigonCard.roleId,
    name: KabigonCard.roleName,
    last: '',
    ts: 0
  },
  {
    id: SistersCard.roleId,
    name: SistersCard.roleName,
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
